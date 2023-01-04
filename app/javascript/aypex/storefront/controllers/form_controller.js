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

  submitWithNearestSubmitButton (event) {
    this.submitButtonTarget.click()
  }

  removeSelection (event) {
    this.radioButtonTargets.forEach((input) => {
      if (input.dataset.radioIndexValue >= event.target.dataset.radioIndexValue) {
        input.checked = false
      }
    })
  }

  resetRadiosWithHigherIndex (event) {
    this.radioButtonTargets.forEach((input) => {
      if (input.dataset.radioIndexValue > event.target.dataset.radioIndexValue) {
        input.checked = false
        input.disabled = true
      }
    })
  }

  optionContainterCheck (event) {
    this.optionTypeContainerTargets.forEach((container) => {
      const checkedOption = container.querySelector('input[type="radio"]:checked')

      if (checkedOption) {
        const resetFormBtn = container.querySelector('.reset-selection')
        if (resetFormBtn) resetFormBtn.style.display = 'block'
      }
    })
  }
}
