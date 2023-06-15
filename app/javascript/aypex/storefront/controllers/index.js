/* eslint-disable no-undef */

import { Application } from '@hotwired/stimulus'

import BsInstanceController from './bs_instance_controller'
import FormController from './form_controller'
import ModalController from './modal_controller'
import MicroFormController from './micro_form_controller'
import SliderController from './slider_controller'
import ScrollController from './scroll_controller'

// Stimulus - Setup
window.Stimulus = Application.start()

Stimulus.register('bs-instance', BsInstanceController)
Stimulus.register('form', FormController)
Stimulus.register('modal', ModalController)
Stimulus.register('micro-form', MicroFormController)
Stimulus.register('slider', SliderController)
Stimulus.register('scroll', ScrollController)
