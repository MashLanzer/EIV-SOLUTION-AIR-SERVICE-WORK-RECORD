// English is the source dictionary: it defines the shape every other language
// must match (see Dictionary in ../index.ts). Grouped by area so it can grow
// screen by screen. Only the areas translated so far live here.
export const en = {
  common: {
    back: "Back",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    on: "On",
    off: "Off",
  },
  appearance: {
    section: "Appearance",
    onThisDevice: "Changes apply on this device only.",
    theme: "Theme",
    light: "Light",
    system: "System",
    dark: "Dark",
    custom: "Custom",
    systemHint: "System follows your phone's light or dark setting.",
    palette: "Palette",
    morePalettes: "More palettes are on the way.",
    reduceMotion: "Reduce motion",
    reduceMotionHint: "Turn off entrance and tap animations",
    tempUnits: "Temperature units",
    tempUnitsHint: "Used for the jobsite weather",
    language: "Language",
    languageHint: "The app's display language",
  },
  settings: {
    title: "Settings",
    company: {
      section: "Company",
      description:
        "Company name, phone, address and license appear on the work record PDF.",
      name: "Company name",
      phone: "Phone",
      address: "Address",
      license: "License number",
      currency: "Currency symbol",
      currencyHelp:
        "Shown before money amounts across the app and PDF (e.g. $, €, £).",
      logo: "Company logo",
      logoHint: "Shown on the work record PDF · PNG or JPG, up to 2 MB",
      upload: "Upload",
      replace: "Replace",
      removeLogo: "Remove logo",
      logoChooseError: "Choose an image to upload.",
      logoTypeError: "That file isn't an image.",
      logoSizeError: "Logo must be 2 MB or smaller.",
      logoGenericError: "Couldn't upload. Try again.",
    },
    workRecords: {
      section: "Work records",
      description: "Defaults and rules applied when workers submit records.",
      requirePhoto: "Require a photo",
      requirePhotoHint: "Records can't be submitted without at least one photo",
      requireHelper: "Require a helper",
      requireHelperHint: "A helper name must be entered on every record",
      requireCustomerSignature: "Require customer signature",
      requireCustomerSignatureHint:
        "Turn off for unattended jobs where the customer can't sign",
      lockApproved: "Lock approved records",
      lockApprovedHint:
        "Once approved, a record must be reopened before anyone can edit it",
      defaultLeadPay: "Default lead pay",
      defaultLeadPayHelp:
        "Pre-fills the lead pay on a new record; workers can still change it.",
      defaultHelperPay: "Default helper pay",
      defaultHelperPayHelp:
        "Pre-fills the helper pay on a new record; workers can still change it.",
      workTypes: "Work types",
      workTypesHint: "Predefined types of work the crew can pick, by category",
      defaultNotes: "Default work notes",
      defaultNotesHelp:
        "Pre-fills the work-performed notes on a new record; leave blank for none.",
      defaultNotesPlaceholder:
        "e.g. Performed standard maintenance. Checked filters, refrigerant and connections.",
    },
    invite: {
      section: "Team invite code",
      allow: "Allow joining by code",
      rotate: "Rotate code",
      rotating: "Rotating…",
      copyCode: "Copy code",
      description:
        "Share this code so someone can join your company. They sign in with Google and enter it.",
      descriptionOff:
        "Joining by code is off. No one can join with a code until you turn this on.",
      rotateTitle: "Rotate invite code?",
      rotateDescription:
        "The current code stops working immediately. Anyone you shared it with will need the new one.",
    },
    about: {
      section: "About",
      admin: "Admin",
      worker: "Worker",
      accessLevel: "Your access level",
      version: "Version",
    },
    signOut: "Sign out",
    signOutTitle: "Sign out?",
    signOutDescription: "You'll need to sign in again to access your account.",
    danger: {
      section: "Danger zone",
      description:
        "Permanently deletes everything in your company — records, customers, projects, photos, teams, checklists and comments. User accounts are kept, so you stay signed in. This can't be undone.",
      reset: "Reset all company data",
    },
  },
} as const;
