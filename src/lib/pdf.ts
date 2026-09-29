import { jsPDF } from "jspdf"
import type { PacketModel } from "../domain/packet"
import type { PhotoRecord } from "../domain/types"
import { blobToJpegDataUrl } from "./images"

export async function buildPdf(model: PacketModel, photos: PhotoRecord[]): Promise<Blob> {
  const sheet = new Sheet()
  if (model.freeBanner) {
    sheet.banner("FREE LOT FILE — stored on this device")
  }
  sheet.heading(model.title)
  sheet.line(`${model.dealership}`)
  sheet.line(`Operator: ${model.operator}`)
  sheet.line(model.stateLine)
  sheet.line(`Generated ${model.generatedAt}`)
  sheet.paragraph(model.counselLine)
  if (model.waiverLine) sheet.paragraph(model.waiverLine)
  sheet.subhead("Account")
  for (const row of model.accountRows) sheet.pair(row.label, row.value)
  sheet.subhead("Stage")
  sheet.line(model.stageLine)
  for (const warning of model.warnings) sheet.paragraph(`Warning: ${warning}`)
  sheet.subhead("Notices")
  sheet.list(model.notices)
  sheet.subhead("Contacts")
  sheet.list(model.contacts)
  sheet.subhead("Guardrails")
  sheet.list(model.checks)
  sheet.subhead("Field spots")
  sheet.list(model.spots)
  sheet.subhead("Personal property")
  sheet.list(model.inventory)
  sheet.subhead("Post-repo worksheet")
  for (const row of model.worksheet) sheet.pair(row.label, row.value)
  sheet.subhead("Photo evidence")
  await embedPhotos(sheet, photos.slice(0, 4))
  if (photos.length > 4) {
    sheet.paragraph(`${photos.length - 4} more photos stay in the on-device file and were not embedded.`)
  }
  sheet.subhead("Audit")
  sheet.list(model.events)
  sheet.subhead("Privacy")
  sheet.paragraph(model.privacy)
  sheet.subhead("Disclaimer")
  sheet.paragraph(model.disclaimer)
  return sheet.doc.output("blob")
}

async function embedPhotos(sheet: Sheet, photos: PhotoRecord[]): Promise<void> {
  if (photos.length === 0) {
    sheet.line("None embedded.")
    return
  }
  for (const photo of photos) {
    const image = await blobToJpegDataUrl(photo.blob)
    sheet.line(`${photo.fileName} · ${photo.createdAt}`)
    if (!image) {
      sheet.line("Could not embed this photo.")
      continue
    }
    const width = 220
    const height = Math.max(40, (image.height / image.width) * width)
    sheet.ensure(height + 12)
    sheet.doc.addImage(image.dataUrl, "JPEG", 48, sheet.y, width, height)
    sheet.y += height + 12
  }
}

class Sheet {
  doc = new jsPDF({ unit: "pt", format: "letter" })
  y = 52
  page = 1
  private readonly left = 48
  private readonly width = 516
  private readonly bottom = 740

  constructor() {
    this.footer()
  }

  ensure(height: number): void {
    if (this.y + height <= this.bottom) return
    this.doc.addPage()
    this.page += 1
    this.y = 52
    this.footer()
  }

  heading(text: string): void {
    this.ensure(28)
    this.doc.setFont("helvetica", "bold")
    this.doc.setFontSize(16)
    this.doc.setTextColor(28, 25, 21)
    this.doc.text(text, this.left, this.y)
    this.y += 22
  }

  subhead(text: string): void {
    this.ensure(24)
    this.y += 8
    this.doc.setFont("helvetica", "bold")
    this.doc.setFontSize(12)
    this.doc.setTextColor(154, 78, 8)
    this.doc.text(text, this.left, this.y)
    this.y += 16
    this.doc.setTextColor(28, 25, 21)
  }

  banner(text: string): void {
    this.ensure(18)
    this.doc.setFont("helvetica", "bold")
    this.doc.setFontSize(9)
    this.doc.setTextColor(142, 36, 36)
    this.doc.text(text, this.left, this.y)
    this.y += 16
    this.doc.setTextColor(28, 25, 21)
  }

  line(text: string): void {
    this.write(text, 10, 13)
  }

  paragraph(text: string): void {
    this.write(text, 10, 13)
  }

  pair(label: string, value: string): void {
    this.write(`${label}: ${value}`, 10, 13)
  }

  list(items: string[]): void {
    if (items.length === 0) {
      this.line("None logged.")
      return
    }
    for (const item of items) this.line(item)
  }

  private write(text: string, size: number, leading: number): void {
    this.doc.setFont("helvetica", "normal")
    this.doc.setFontSize(size)
    this.doc.setTextColor(28, 25, 21)
    const lines = this.doc.splitTextToSize(text, this.width) as string[]
    this.ensure(lines.length * leading + 4)
    this.doc.text(lines, this.left, this.y)
    this.y += lines.length * leading + 2
  }

  private footer(): void {
    this.doc.setFont("helvetica", "normal")
    this.doc.setFontSize(8)
    this.doc.setTextColor(90)
    this.doc.text(
      "RepoFuse operational log · generated on this device · not a legal opinion · borrower file was not uploaded",
      this.left,
      770,
    )
    this.doc.text(String(this.page), 560, 770)
  }
}
