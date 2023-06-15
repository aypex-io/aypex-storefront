import { Controller } from '@hotwired/stimulus'
import Splide from '@splidejs/splide'

export default class extends Controller {
  connect () {
    this.slider.mount()
  }

  disconect () {
    this.slider.destroy(true)
  }

  get slider () {
    const slider = new Splide(this.element, {
      type: 'slider',
      rewind: true,
      lazyLoad: 'sequential'

    })

    return slider
  }
}
