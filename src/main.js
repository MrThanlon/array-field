import { createApp } from 'vue'
import VueI18n from './languages'
import App from './App.vue'
import router from './router'

createApp(App).use(router).use(VueI18n).mount('#app')
