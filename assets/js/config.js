/* =====================================================================
   ANTHROXIA — CONFIGURAÇÃO DE DOWNLOADS
   ---------------------------------------------------------------------
   Este é o ÚNICO arquivo que você precisa editar quando o KAZER
   estiver pronto para download. Enquanto os campos estiverem vazios,
   o site mostra "Em breve" e os botões ficam desativados —
   nenhum link falso é exibido.

   Como preencher (pelo celular, direto no GitHub):
   1. Abra este arquivo no GitHub → ícone de lápis (Edit).
   2. Preencha os campos abaixo com os dados REAIS do release.
   3. Troque `status` para "beta" ou "available".
   4. Commit. Pronto: o site atualiza sozinho no próximo deploy.

   Regras de segurança aplicadas pelo site:
   - apkUrl / playStoreUrl / webUrl só são aceitos se começarem com https://
   - sha256 só aparece se tiver exatamente 64 caracteres hexadecimais
   ===================================================================== */

window.ANTHROXIA_CONFIG = {
  kazer: {
    // "coming-soon" | "beta" | "available"
    status: "coming-soon",

    android: {
      version: "",          // ex.: "1.0.0"
      versionCode: null,    // ex.: 1
      sizeBytes: null,      // ex.: 48234496  (tamanho real do APK em bytes)
      minAndroid: "",       // ex.: "Android 10+"
      sha256: "",           // hash SHA-256 do APK (64 caracteres)
      apkUrl: "",           // ex.: "https://github.com/jeanvicen/KAZER/releases/download/v1.0.0/KAZER-Android-v1.0.0-release.apk"
      playStoreUrl: "",     // ex.: "https://play.google.com/store/apps/details?id=com.kazer.app"
      releaseNotesUrl: "",  // ex.: link do GitHub Release
      publishedAt: ""       // ex.: "2026-12-01"
    },

    web: {
      url: ""               // ex.: "https://kazer.app"
    },

    privacyPolicyUrl: ""    // obrigatório antes de publicar na Play Store
  },

  contact: {
    email: "",              // ex.: "contato@anthroxia.com"
    instagram: ""           // ex.: "https://instagram.com/anthroxia"
  }
};
