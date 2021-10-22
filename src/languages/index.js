import { createI18n } from 'vue-i18n/index'
import zhCN from './zh-cn'
import en from './en'

const i18n = createI18n({
  locale: window.navigator.language.toLowerCase(),
  messages: {
    'zh-cn': zhCN,
    en
  }
})

export default i18n
