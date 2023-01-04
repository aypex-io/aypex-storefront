import { Controller } from '@hotwired/stimulus'
import { useDebounce } from 'stimulus-use'

export default class extends Controller {
  static targets = ['submitButton', 'radioButton', 'optionTypeContainer']

  static values = {
    delay: { default: 0, type: Number }
  }

  static debounces = [
    {
      name: 'submitViaClick'
    }
  ]

  initialize () {
    this.submitViaClick = this.submitViaClick.bind(this)
  }

  connect () {
    useDebounce(this, { wait: this.delayValue })
    if (this.hasSubmitButtonTarget) this.submitButtonTarget.style.display = 'none'
  }

  submitViaClick (event) {
    this.submitButtonTarget.click()
  }
}
