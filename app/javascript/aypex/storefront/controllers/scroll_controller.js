import ScrollTo from 'stimulus-scroll-to'
import { useDebounce } from 'stimulus-use'

export default class extends ScrollTo {
  static debounces = ['scroll']

  connect () {
    useDebounce(this, { wait: 300 })

    this.scroll()
  }

  scroll () {
    const attrs = this.element.getAttribute('data-controller')
    const unique = [...new Set(attrs.split(' '))]
    const result = unique.filter(e => e !== '')

    if (result.includes('scroll')) {
      const elementPosition = this.element.getBoundingClientRect().top + window.pageYOffset
      const offsetPosition = elementPosition - 60

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }
}
