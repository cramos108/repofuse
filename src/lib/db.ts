import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb"
import type {
  Account,
  AuditEvent,
  ChecklistAck,
  ContactRecord,
  ExpenseLine,
  InventoryItem,
  LotSnapshot,
  NoticeRecord,
  PhotoRecord,
  PhotoSnapshot,
  SpotRecord,
  Workspace,
} from "../domain/types"
import { base64ToBlob, blobToBase64 } from "./codec"

interface RepoDB extends DBSchema {
  workspace: { key: string; value: Workspace }
  accounts: { key: string; value: Account }
  events: { key: string; value: AuditEvent }
  notices: { key: string; value: NoticeRecord }
  contacts: { key: string; value: ContactRecord }
  checks: { key: string; value: ChecklistAck }
  spots: { key: string; value: SpotRecord }
  photos: { key: string; value: PhotoRecord }
  inventory: { key: string; value: InventoryItem }
  expenses: { key: string; value: ExpenseLine }
}

const GRAPH = [
  "events",
  "notices",
  "contacts",
  "checks",
  "spots",
  "photos",
  "inventory",
  "expenses",
] as const

export interface LotData {
  workspace: Workspace | null
  accounts: Account[]
  events: AuditEvent[]
  notices: NoticeRecord[]
  contacts: ContactRecord[]
  checks: ChecklistAck[]
  spots: SpotRecord[]
  inventory: InventoryItem[]
  expenses: ExpenseLine[]
}

let dbPromise: Promise<IDBPDatabase<RepoDB>> | null = null

export function getDb(): Promise<IDBPDatabase<RepoDB>> {
  if (!dbPromise) {
    dbPromise = openDB<RepoDB>("repofuse", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("workspace")) db.createObjectStore("workspace")
        const keyed = ["accounts", ...GRAPH] as const
        for (const name of keyed) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: "id" })
          }
        }
      },
      blocking() {
        void dbPromise?.then((db) => db.close())
        dbPromise = null
      },
    }).catch((error: unknown) => {
      dbPromise = null
      throw error
    })
  }
  return dbPromise
}

export async function loadLot(): Promise<LotData> {
  const db = await getDb()
  const [workspace, accounts, events, notices, contacts, checks, spots, inventory, expenses] =
    await Promise.all([
      db.get("workspace", "workspace"),
      db.getAll("accounts"),
      db.getAll("events"),
      db.getAll("notices"),
      db.getAll("contacts"),
      db.getAll("checks"),
      db.getAll("spots"),
      db.getAll("inventory"),
      db.getAll("expenses"),
    ])
  return {
    workspace: workspace ?? null,
    accounts,
    events,
    notices,
    contacts,
    checks,
    spots,
    inventory,
    expenses,
  }
}

export async function saveWorkspace(workspace: Workspace): Promise<void> {
  const db = await getDb()
  await db.put("workspace", workspace, "workspace")
}

export async function putAccount(account: Account, event?: AuditEvent): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(["accounts", "events"], "readwrite")
  await tx.objectStore("accounts").put(account)
  if (event) await tx.objectStore("events").put(event)
  await tx.done
}

export async function putNotice(notice: NoticeRecord, account: Account, event: AuditEvent): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(["notices", "accounts", "events"], "readwrite")
  await tx.objectStore("notices").put(notice)
  await tx.objectStore("accounts").put(account)
  await tx.objectStore("events").put(event)
  await tx.done
}

export async function putContact(contact: ContactRecord, account: Account, event: AuditEvent): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(["contacts", "accounts", "events"], "readwrite")
  await tx.objectStore("contacts").put(contact)
  await tx.objectStore("accounts").put(account)
  await tx.objectStore("events").put(event)
  await tx.done
}

export async function putCheck(check: ChecklistAck, account: Account, event: AuditEvent): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(["checks", "accounts", "events"], "readwrite")
  await tx.objectStore("checks").put(check)
  await tx.objectStore("accounts").put(account)
  await tx.objectStore("events").put(event)
  await tx.done
}

export async function putSpot(
  spot: SpotRecord,
  photos: PhotoRecord[],
  account: Account,
  event: AuditEvent,
): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(["spots", "photos", "accounts", "events"], "readwrite")
  for (const photo of photos) await tx.objectStore("photos").put(photo)
  await tx.objectStore("spots").put(spot)
  await tx.objectStore("accounts").put(account)
  await tx.objectStore("events").put(event)
  await tx.done
}

export async function putInventory(item: InventoryItem, account: Account, event: AuditEvent): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(["inventory", "accounts", "events"], "readwrite")
  await tx.objectStore("inventory").put(item)
  await tx.objectStore("accounts").put(account)
  await tx.objectStore("events").put(event)
  await tx.done
}

export async function putExpense(expense: ExpenseLine, account: Account, event: AuditEvent): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(["expenses", "accounts", "events"], "readwrite")
  await tx.objectStore("expenses").put(expense)
  await tx.objectStore("accounts").put(account)
  await tx.objectStore("events").put(event)
  await tx.done
}

export async function deleteExpense(id: string, account: Account, event: AuditEvent): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(["expenses", "accounts", "events"], "readwrite")
  await tx.objectStore("expenses").delete(id)
  await tx.objectStore("accounts").put(account)
  await tx.objectStore("events").put(event)
  await tx.done
}

export async function getPhoto(id: string): Promise<PhotoRecord | undefined> {
  const db = await getDb()
  return db.get("photos", id)
}

export async function photosForAccount(accountId: string): Promise<PhotoRecord[]> {
  const db = await getDb()
  const photos = await db.getAll("photos")
  return photos.filter((photo) => photo.accountId === accountId)
}

export async function deleteAccountGraph(accountId: string): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(["accounts", ...GRAPH], "readwrite")
  for (const name of GRAPH) {
    const rows = await tx.objectStore(name).getAll()
    for (const row of rows) {
      if (row.accountId === accountId) await tx.objectStore(name).delete(row.id)
    }
  }
  await tx.objectStore("accounts").delete(accountId)
  await tx.done
}

export async function exportSnapshot(): Promise<LotSnapshot> {
  const lot = await loadLot()
  if (!lot.workspace) throw new Error("Set up the lot before exporting a restore file.")
  const db = await getDb()
  const photos = await db.getAll("photos")
  const encoded: PhotoSnapshot[] = []
  for (const photo of photos) {
    encoded.push({
      id: photo.id,
      accountId: photo.accountId,
      spotId: photo.spotId,
      createdAt: photo.createdAt,
      fileName: photo.fileName,
      mime: photo.mime,
      base64: await blobToBase64(photo.blob),
    })
  }
  return {
    format: "repofuse-lot",
    version: 1,
    exportedAt: new Date().toISOString(),
    workspace: lot.workspace,
    accounts: lot.accounts,
    notices: lot.notices,
    contacts: lot.contacts,
    checks: lot.checks,
    spots: lot.spots,
    inventory: lot.inventory,
    expenses: lot.expenses,
    events: lot.events,
    photos: encoded,
  }
}

export async function replaceLot(snapshot: LotSnapshot): Promise<void> {
  if (snapshot.format !== "repofuse-lot" || snapshot.version !== 1) {
    throw new Error("That file is not a RepoFuse lot restore.")
  }
  if (!snapshot.workspace || snapshot.workspace.id !== "workspace") {
    throw new Error("The restore file has no workspace.")
  }
  const db = await getDb()
  const tx = db.transaction(["workspace", "accounts", ...GRAPH], "readwrite")
  await tx.objectStore("workspace").clear()
  for (const name of GRAPH) await tx.objectStore(name).clear()
  await tx.objectStore("accounts").clear()
  await tx.objectStore("workspace").put(snapshot.workspace, "workspace")
  for (const row of snapshot.accounts) await tx.objectStore("accounts").put(row)
  for (const row of snapshot.events) await tx.objectStore("events").put(row)
  for (const row of snapshot.notices) await tx.objectStore("notices").put(row)
  for (const row of snapshot.contacts) await tx.objectStore("contacts").put(row)
  for (const row of snapshot.checks) await tx.objectStore("checks").put(row)
  for (const row of snapshot.spots) await tx.objectStore("spots").put(row)
  for (const row of snapshot.inventory) await tx.objectStore("inventory").put(row)
  for (const row of snapshot.expenses) await tx.objectStore("expenses").put(row)
  for (const photo of snapshot.photos) {
    const record: PhotoRecord = {
      id: photo.id,
      accountId: photo.accountId,
      spotId: photo.spotId,
      createdAt: photo.createdAt,
      fileName: photo.fileName,
      mime: photo.mime,
      blob: base64ToBlob(photo.base64, photo.mime || "application/octet-stream"),
    }
    await tx.objectStore("photos").put(record)
  }
  await tx.done
}

export async function eraseLot(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise
    db.close()
    dbPromise = null
  }
  await deleteDB("repofuse")
}
