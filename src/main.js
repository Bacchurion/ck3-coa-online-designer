import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createBootstrap } from 'bootstrap-vue-next/plugins/createBootstrap'
import VueKonva from 'vue-konva'
import { createI18n } from 'vue-i18n'
import Notifications from '@kyvg/vue3-notification'
import 'vue-color/style.css';
import './style.css'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue-next/dist/bootstrap-vue-next.css'

import App from './App.vue'
import router from './router'

// Import des fichiers de traduction
import en from './locales/en.json'
import fr from './locales/fr.json'

// Détection de la langue navigateur
const browserLocale = navigator.language?.split('-')[0] || 'en'
const supportedLocales = ['en', 'fr']
const locale = supportedLocales.includes(browserLocale) ? browserLocale : 'en'

const i18n = createI18n({
  legacy: false,
  locale,
  fallbackLocale: 'en',
  messages: {
    en,
    fr
  }
})

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(createBootstrap())
app.use(VueKonva)
app.use(i18n)
app.use(Notifications)

app.mount('#app')
