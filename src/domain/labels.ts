import type { ContactChannel, NoticeKind, NoticeMethod } from "./types"

export const NOTICE_LABEL: Record<NoticeKind, string> = {
  right_to_cure: "Right to cure",
  intent_to_dispose: "Notice of intent to dispose",
  storage: "Storage notice",
  personal_property: "Personal-property notice",
  deficiency_surplus: "Deficiency or surplus notice",
}

export const METHOD_LABEL: Record<NoticeMethod, string> = {
  certified_mail: "Certified mail",
  first_class: "First-class mail",
  personal: "Personal delivery",
  other: "Other method",
}

export const CHANNEL_LABEL: Record<ContactChannel, string> = {
  phone: "Phone",
  text: "Text",
  email: "Email",
  in_person: "In person",
  letter: "Letter",
}
