import type { Dictionary } from "@/lib/i18n/types";

// Spanish. Typed as Dictionary so a missing or renamed key fails the build.
export const es: Dictionary = {
  common: {
    back: "Atrás",
    edit: "Editar",
    save: "Guardar",
    cancel: "Cancelar",
    on: "Activado",
    off: "Desactivado",
  },
  appearance: {
    section: "Apariencia",
    onThisDevice: "Los cambios aplican solo en este dispositivo.",
    theme: "Tema",
    light: "Claro",
    system: "Sistema",
    dark: "Oscuro",
    custom: "Personalizado",
    systemHint: "Sistema sigue el modo claro u oscuro de tu teléfono.",
    palette: "Paleta",
    morePalettes: "Pronto habrá más paletas.",
    reduceMotion: "Reducir movimiento",
    reduceMotionHint: "Desactiva las animaciones de entrada y de toque",
    tempUnits: "Unidades de temperatura",
    tempUnitsHint: "Se usan para el clima del jobsite",
    language: "Idioma",
    languageHint: "El idioma de la aplicación",
  },
  settings: {
    title: "Ajustes",
    company: {
      section: "Empresa",
      description:
        "El nombre, teléfono, dirección y licencia de la empresa aparecen en el PDF del registro.",
      name: "Nombre de la empresa",
      phone: "Teléfono",
      address: "Dirección",
      license: "Número de licencia",
      currency: "Símbolo de moneda",
      currencyHelp:
        "Se muestra antes de los montos en la app y el PDF (ej. $, €, £).",
      logo: "Logo de la empresa",
      logoHint: "Se muestra en el PDF del registro · PNG o JPG, hasta 2 MB",
      upload: "Subir",
      replace: "Reemplazar",
      removeLogo: "Quitar logo",
      logoChooseError: "Elige una imagen para subir.",
      logoTypeError: "Ese archivo no es una imagen.",
      logoSizeError: "El logo debe pesar 2 MB o menos.",
      logoGenericError: "No se pudo subir. Inténtalo de nuevo.",
    },
    workRecords: {
      section: "Registros de trabajo",
      description:
        "Valores por defecto y reglas al enviar registros los trabajadores.",
      requirePhoto: "Requerir una foto",
      requirePhotoHint: "No se puede enviar un registro sin al menos una foto",
      requireHelper: "Requerir un ayudante",
      requireHelperHint: "Se debe indicar un ayudante en cada registro",
      requireCustomerSignature: "Requerir firma del cliente",
      requireCustomerSignatureHint:
        "Desactívalo para trabajos sin cliente presente que no pueden firmar",
      lockApproved: "Bloquear registros aprobados",
      lockApprovedHint:
        "Una vez aprobado, hay que reabrir el registro antes de poder editarlo",
      defaultLeadPay: "Pago líder por defecto",
      defaultLeadPayHelp:
        "Pre-llena el pago del líder en un registro nuevo; el trabajador puede cambiarlo.",
      defaultHelperPay: "Pago ayudante por defecto",
      defaultHelperPayHelp:
        "Pre-llena el pago del ayudante en un registro nuevo; el trabajador puede cambiarlo.",
      workTypes: "Tipos de trabajo",
      workTypesHint:
        "Tipos de trabajo predefinidos que el equipo puede elegir, por categoría",
      defaultNotes: "Notas de trabajo por defecto",
      defaultNotesHelp:
        "Pre-llena las notas del trabajo en un registro nuevo; déjalo vacío para ninguna.",
      defaultNotesPlaceholder:
        "ej. Se realizó mantenimiento estándar. Se revisaron filtros, refrigerante y conexiones.",
    },
    invite: {
      section: "Código de invitación",
      allow: "Permitir unirse con código",
      rotate: "Regenerar código",
      description:
        "Comparte este código para que alguien se una a tu empresa. Inicia sesión con Google y lo ingresa.",
    },
    about: {
      section: "Acerca de",
      admin: "Administrador",
      worker: "Trabajador",
      accessLevel: "Tu nivel de acceso",
      version: "Versión",
    },
    signOut: "Cerrar sesión",
    danger: {
      section: "Zona de peligro",
      description:
        "Elimina permanentemente todo en tu empresa: registros, clientes, proyectos, fotos, equipos, listas y comentarios. Las cuentas de usuario se conservan, así que tu sesión sigue activa. Esto no se puede deshacer.",
      reset: "Restablecer todos los datos de la empresa",
    },
  },
};
