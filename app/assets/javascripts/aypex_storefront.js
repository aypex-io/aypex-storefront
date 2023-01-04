(function () {
  if (window.Reflect === undefined || window.customElements === undefined || window.customElements.polyfillWrapFlushCallback) {
    return
  }
  const BuiltInHTMLElement = HTMLElement
  const wrapperForTheName = {
    HTMLElement: function HTMLElement () {
      return Reflect.construct(BuiltInHTMLElement, [], this.constructor)
    }
  }
  window.HTMLElement = wrapperForTheName.HTMLElement
  HTMLElement.prototype = BuiltInHTMLElement.prototype
  HTMLElement.prototype.constructor = HTMLElement
  Object.setPrototypeOf(HTMLElement, BuiltInHTMLElement)
})();

(function (prototype) {
  if (typeof prototype.requestSubmit === 'function') return
  prototype.requestSubmit = function (submitter) {
    if (submitter) {
      validateSubmitter(submitter, this)
      submitter.click()
    } else {
      submitter = document.createElement('input')
      submitter.type = 'submit'
      submitter.hidden = true
      this.appendChild(submitter)
      submitter.click()
      this.removeChild(submitter)
    }
  }
  function validateSubmitter (submitter, form) {
    submitter instanceof HTMLElement || raise(TypeError, "parameter 1 is not of type 'HTMLElement'")
    submitter.type == 'submit' || raise(TypeError, 'The specified element is not a submit button')
    submitter.form == form || raise(DOMException, 'The specified element is not owned by this form element', 'NotFoundError')
  }
  function raise (errorConstructor, message, name) {
    throw new errorConstructor("Failed to execute 'requestSubmit' on 'HTMLFormElement': " + message + '.', name)
  }
})(HTMLFormElement.prototype)

const submittersByForm = new WeakMap()

function findSubmitterFromClickTarget (target) {
  const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null
  const candidate = element ? element.closest('input, button') : null
  return (candidate === null || candidate === void 0 ? void 0 : candidate.type) == 'submit' ? candidate : null
}

function clickCaptured (event) {
  const submitter = findSubmitterFromClickTarget(event.target)
  if (submitter && submitter.form) {
    submittersByForm.set(submitter.form, submitter)
  }
}

(function () {
  if ('submitter' in Event.prototype) return
  let prototype
  if ('SubmitEvent' in window && /Apple Computer/.test(navigator.vendor)) {
    prototype = window.SubmitEvent.prototype
  } else if ('SubmitEvent' in window) {
    return
  } else {
    prototype = window.Event.prototype
  }
  addEventListener('click', clickCaptured, true)
  Object.defineProperty(prototype, 'submitter', {
    get () {
      if (this.type == 'submit' && this.target instanceof HTMLFormElement) {
        return submittersByForm.get(this.target)
      }
    }
  })
})()

let FrameLoadingStyle;

(function (FrameLoadingStyle) {
  FrameLoadingStyle.eager = 'eager'
  FrameLoadingStyle.lazy = 'lazy'
})(FrameLoadingStyle || (FrameLoadingStyle = {}))

class FrameElement extends HTMLElement {
  constructor () {
    super()
    this.loaded = Promise.resolve()
    this.delegate = new FrameElement.delegateConstructor(this)
  }

  static get observedAttributes () {
    return ['disabled', 'complete', 'loading', 'src']
  }

  connectedCallback () {
    this.delegate.connect()
  }

  disconnectedCallback () {
    this.delegate.disconnect()
  }

  reload () {
    return this.delegate.sourceURLReloaded()
  }

  attributeChangedCallback (name) {
    if (name == 'loading') {
      this.delegate.loadingStyleChanged()
    } else if (name == 'complete') {
      this.delegate.completeChanged()
    } else if (name == 'src') {
      this.delegate.sourceURLChanged()
    } else {
      this.delegate.disabledChanged()
    }
  }

  get src () {
    return this.getAttribute('src')
  }

  set src (value) {
    if (value) {
      this.setAttribute('src', value)
    } else {
      this.removeAttribute('src')
    }
  }

  get loading () {
    return frameLoadingStyleFromString(this.getAttribute('loading') || '')
  }

  set loading (value) {
    if (value) {
      this.setAttribute('loading', value)
    } else {
      this.removeAttribute('loading')
    }
  }

  get disabled () {
    return this.hasAttribute('disabled')
  }

  set disabled (value) {
    if (value) {
      this.setAttribute('disabled', '')
    } else {
      this.removeAttribute('disabled')
    }
  }

  get autoscroll () {
    return this.hasAttribute('autoscroll')
  }

  set autoscroll (value) {
    if (value) {
      this.setAttribute('autoscroll', '')
    } else {
      this.removeAttribute('autoscroll')
    }
  }

  get complete () {
    return !this.delegate.isLoading
  }

  get isActive () {
    return this.ownerDocument === document && !this.isPreview
  }

  get isPreview () {
    let _a, _b
    return (_b = (_a = this.ownerDocument) === null || _a === void 0 ? void 0 : _a.documentElement) === null || _b === void 0 ? void 0 : _b.hasAttribute('data-turbo-preview')
  }
}

function frameLoadingStyleFromString (style) {
  switch (style.toLowerCase()) {
    case 'lazy':
      return FrameLoadingStyle.lazy

    default:
      return FrameLoadingStyle.eager
  }
}

function expandURL (locatable) {
  return new URL(locatable.toString(), document.baseURI)
}

function getAnchor (url) {
  let anchorMatch
  if (url.hash) {
    return url.hash.slice(1)
  } else if (anchorMatch = url.href.match(/#(.*)$/)) {
    return anchorMatch[1]
  }
}

function getAction (form, submitter) {
  const action = (submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute('formaction')) || form.getAttribute('action') || form.action
  return expandURL(action)
}

function getExtension (url) {
  return (getLastPathComponent(url).match(/\.[^.]*$/) || [])[0] || ''
}

function isHTML (url) {
  return !!getExtension(url).match(/^(?:|\.(?:htm|html|xhtml|php))$/)
}

function isPrefixedBy (baseURL, url) {
  const prefix = getPrefix(url)
  return baseURL.href === expandURL(prefix).href || baseURL.href.startsWith(prefix)
}

function locationIsVisitable (location, rootLocation) {
  return isPrefixedBy(location, rootLocation) && isHTML(location)
}

function getRequestURL (url) {
  const anchor = getAnchor(url)
  return anchor != null ? url.href.slice(0, -(anchor.length + 1)) : url.href
}

function toCacheKey (url) {
  return getRequestURL(url)
}

function urlsAreEqual (left, right) {
  return expandURL(left).href == expandURL(right).href
}

function getPathComponents (url) {
  return url.pathname.split('/').slice(1)
}

function getLastPathComponent (url) {
  return getPathComponents(url).slice(-1)[0]
}

function getPrefix (url) {
  return addTrailingSlash(url.origin + url.pathname)
}

function addTrailingSlash (value) {
  return value.endsWith('/') ? value : value + '/'
}

class FetchResponse {
  constructor (response) {
    this.response = response
  }

  get succeeded () {
    return this.response.ok
  }

  get failed () {
    return !this.succeeded
  }

  get clientError () {
    return this.statusCode >= 400 && this.statusCode <= 499
  }

  get serverError () {
    return this.statusCode >= 500 && this.statusCode <= 599
  }

  get redirected () {
    return this.response.redirected
  }

  get location () {
    return expandURL(this.response.url)
  }

  get isHTML () {
    return this.contentType && this.contentType.match(/^(?:text\/([^\s;,]+\b)?html|application\/xhtml\+xml)\b/)
  }

  get statusCode () {
    return this.response.status
  }

  get contentType () {
    return this.header('Content-Type')
  }

  get responseText () {
    return this.response.clone().text()
  }

  get responseHTML () {
    if (this.isHTML) {
      return this.response.clone().text()
    } else {
      return Promise.resolve(undefined)
    }
  }

  header (name) {
    return this.response.headers.get(name)
  }
}

function isAction (action) {
  return action == 'advance' || action == 'replace' || action == 'restore'
}

function activateScriptElement (element) {
  if (element.getAttribute('data-turbo-eval') == 'false') {
    return element
  } else {
    const createdScriptElement = document.createElement('script')
    const cspNonce = getMetaContent('csp-nonce')
    if (cspNonce) {
      createdScriptElement.nonce = cspNonce
    }
    createdScriptElement.textContent = element.textContent
    createdScriptElement.async = false
    copyElementAttributes(createdScriptElement, element)
    return createdScriptElement
  }
}

function copyElementAttributes (destinationElement, sourceElement) {
  for (const { name, value } of sourceElement.attributes) {
    destinationElement.setAttribute(name, value)
  }
}

function createDocumentFragment (html) {
  const template = document.createElement('template')
  template.innerHTML = html
  return template.content
}

function dispatch$1 (eventName, { target, cancelable, detail } = {}) {
  const event = new CustomEvent(eventName, {
    cancelable,
    bubbles: true,
    detail
  })
  if (target && target.isConnected) {
    target.dispatchEvent(event)
  } else {
    document.documentElement.dispatchEvent(event)
  }
  return event
}

function nextAnimationFrame () {
  return new Promise(resolve => requestAnimationFrame(() => resolve()))
}

function nextEventLoopTick () {
  return new Promise(resolve => setTimeout(() => resolve(), 0))
}

function nextMicrotask () {
  return Promise.resolve()
}

function parseHTMLDocument (html = '') {
  return (new DOMParser()).parseFromString(html, 'text/html')
}

function unindent (strings, ...values) {
  const lines = interpolate(strings, values).replace(/^\n/, '').split('\n')
  const match = lines[0].match(/^\s+/)
  const indent = match ? match[0].length : 0
  return lines.map(line => line.slice(indent)).join('\n')
}

function interpolate (strings, values) {
  return strings.reduce((result, string, i) => {
    const value = values[i] == undefined ? '' : values[i]
    return result + string + value
  }, '')
}

function uuid () {
  return Array.from({
    length: 36
  }).map((_, i) => {
    if (i == 8 || i == 13 || i == 18 || i == 23) {
      return '-'
    } else if (i == 14) {
      return '4'
    } else if (i == 19) {
      return (Math.floor(Math.random() * 4) + 8).toString(16)
    } else {
      return Math.floor(Math.random() * 15).toString(16)
    }
  }).join('')
}

function getAttribute (attributeName, ...elements) {
  for (const value of elements.map(element => element === null || element === void 0 ? void 0 : element.getAttribute(attributeName))) {
    if (typeof value === 'string') return value
  }
  return null
}

function hasAttribute (attributeName, ...elements) {
  return elements.some(element => element && element.hasAttribute(attributeName))
}

function markAsBusy (...elements) {
  for (const element of elements) {
    if (element.localName == 'turbo-frame') {
      element.setAttribute('busy', '')
    }
    element.setAttribute('aria-busy', 'true')
  }
}

function clearBusyState (...elements) {
  for (const element of elements) {
    if (element.localName == 'turbo-frame') {
      element.removeAttribute('busy')
    }
    element.removeAttribute('aria-busy')
  }
}

function waitForLoad (element, timeoutInMilliseconds = 2e3) {
  return new Promise(resolve => {
    const onComplete = () => {
      element.removeEventListener('error', onComplete)
      element.removeEventListener('load', onComplete)
      resolve()
    }
    element.addEventListener('load', onComplete, {
      once: true
    })
    element.addEventListener('error', onComplete, {
      once: true
    })
    setTimeout(resolve, timeoutInMilliseconds)
  })
}

function getHistoryMethodForAction (action) {
  switch (action) {
    case 'replace':
      return history.replaceState

    case 'advance':
    case 'restore':
      return history.pushState
  }
}

function getVisitAction (...elements) {
  const action = getAttribute('data-turbo-action', ...elements)
  return isAction(action) ? action : null
}

function getMetaElement (name) {
  return document.querySelector(`meta[name="${name}"]`)
}

function getMetaContent (name) {
  const element = getMetaElement(name)
  return element && element.content
}

function setMetaContent (name, content) {
  let element = getMetaElement(name)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute('name', name)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
  return element
}

let FetchMethod;

(function (FetchMethod) {
  FetchMethod[FetchMethod.get = 0] = 'get'
  FetchMethod[FetchMethod.post = 1] = 'post'
  FetchMethod[FetchMethod.put = 2] = 'put'
  FetchMethod[FetchMethod.patch = 3] = 'patch'
  FetchMethod[FetchMethod.delete = 4] = 'delete'
})(FetchMethod || (FetchMethod = {}))

function fetchMethodFromString (method) {
  switch (method.toLowerCase()) {
    case 'get':
      return FetchMethod.get

    case 'post':
      return FetchMethod.post

    case 'put':
      return FetchMethod.put

    case 'patch':
      return FetchMethod.patch

    case 'delete':
      return FetchMethod.delete
  }
}

class FetchRequest {
  constructor (delegate, method, location, body = new URLSearchParams(), target = null) {
    this.abortController = new AbortController()
    this.resolveRequestPromise = _value => {}
    this.delegate = delegate
    this.method = method
    this.headers = this.defaultHeaders
    this.body = body
    this.url = location
    this.target = target
  }

  get location () {
    return this.url
  }

  get params () {
    return this.url.searchParams
  }

  get entries () {
    return this.body ? Array.from(this.body.entries()) : []
  }

  cancel () {
    this.abortController.abort()
  }

  async perform () {
    let _a, _b
    const { fetchOptions } = this;
    (_b = (_a = this.delegate).prepareHeadersForRequest) === null || _b === void 0 ? void 0 : _b.call(_a, this.headers, this)
    await this.allowRequestToBeIntercepted(fetchOptions)
    try {
      this.delegate.requestStarted(this)
      const response = await fetch(this.url.href, fetchOptions)
      return await this.receive(response)
    } catch (error) {
      if (error.name !== 'AbortError') {
        if (this.willDelegateErrorHandling(error)) {
          this.delegate.requestErrored(this, error)
        }
        throw error
      }
    } finally {
      this.delegate.requestFinished(this)
    }
  }

  async receive (response) {
    const fetchResponse = new FetchResponse(response)
    const event = dispatch$1('turbo:before-fetch-response', {
      cancelable: true,
      detail: {
        fetchResponse
      },
      target: this.target
    })
    if (event.defaultPrevented) {
      this.delegate.requestPreventedHandlingResponse(this, fetchResponse)
    } else if (fetchResponse.succeeded) {
      this.delegate.requestSucceededWithResponse(this, fetchResponse)
    } else {
      this.delegate.requestFailedWithResponse(this, fetchResponse)
    }
    return fetchResponse
  }

  get fetchOptions () {
    let _a
    return {
      method: FetchMethod[this.method].toUpperCase(),
      credentials: 'same-origin',
      headers: this.headers,
      redirect: 'follow',
      body: this.isIdempotent ? null : this.body,
      signal: this.abortSignal,
      referrer: (_a = this.delegate.referrer) === null || _a === void 0 ? void 0 : _a.href
    }
  }

  get defaultHeaders () {
    return {
      Accept: 'text/html, application/xhtml+xml'
    }
  }

  get isIdempotent () {
    return this.method == FetchMethod.get
  }

  get abortSignal () {
    return this.abortController.signal
  }

  acceptResponseType (mimeType) {
    this.headers.Accept = [mimeType, this.headers.Accept].join(', ')
  }

  async allowRequestToBeIntercepted (fetchOptions) {
    const requestInterception = new Promise(resolve => this.resolveRequestPromise = resolve)
    const event = dispatch$1('turbo:before-fetch-request', {
      cancelable: true,
      detail: {
        fetchOptions,
        url: this.url,
        resume: this.resolveRequestPromise
      },
      target: this.target
    })
    if (event.defaultPrevented) await requestInterception
  }

  willDelegateErrorHandling (error) {
    const event = dispatch$1('turbo:fetch-request-error', {
      target: this.target,
      cancelable: true,
      detail: {
        request: this,
        error
      }
    })
    return !event.defaultPrevented
  }
}

class AppearanceObserver {
  constructor (delegate, element) {
    this.started = false
    this.intersect = entries => {
      const lastEntry = entries.slice(-1)[0]
      if (lastEntry === null || lastEntry === void 0 ? void 0 : lastEntry.isIntersecting) {
        this.delegate.elementAppearedInViewport(this.element)
      }
    }
    this.delegate = delegate
    this.element = element
    this.intersectionObserver = new IntersectionObserver(this.intersect)
  }

  start () {
    if (!this.started) {
      this.started = true
      this.intersectionObserver.observe(this.element)
    }
  }

  stop () {
    if (this.started) {
      this.started = false
      this.intersectionObserver.unobserve(this.element)
    }
  }
}

class StreamMessage {
  constructor (fragment) {
    this.fragment = importStreamElements(fragment)
  }

  static wrap (message) {
    if (typeof message === 'string') {
      return new this(createDocumentFragment(message))
    } else {
      return message
    }
  }
}

StreamMessage.contentType = 'text/vnd.turbo-stream.html'

function importStreamElements (fragment) {
  for (const element of fragment.querySelectorAll('turbo-stream')) {
    const streamElement = document.importNode(element, true)
    for (const inertScriptElement of streamElement.templateElement.content.querySelectorAll('script')) {
      inertScriptElement.replaceWith(activateScriptElement(inertScriptElement))
    }
    element.replaceWith(streamElement)
  }
  return fragment
}

let FormSubmissionState;

(function (FormSubmissionState) {
  FormSubmissionState[FormSubmissionState.initialized = 0] = 'initialized'
  FormSubmissionState[FormSubmissionState.requesting = 1] = 'requesting'
  FormSubmissionState[FormSubmissionState.waiting = 2] = 'waiting'
  FormSubmissionState[FormSubmissionState.receiving = 3] = 'receiving'
  FormSubmissionState[FormSubmissionState.stopping = 4] = 'stopping'
  FormSubmissionState[FormSubmissionState.stopped = 5] = 'stopped'
})(FormSubmissionState || (FormSubmissionState = {}))

let FormEnctype;

(function (FormEnctype) {
  FormEnctype.urlEncoded = 'application/x-www-form-urlencoded'
  FormEnctype.multipart = 'multipart/form-data'
  FormEnctype.plain = 'text/plain'
})(FormEnctype || (FormEnctype = {}))

function formEnctypeFromString (encoding) {
  switch (encoding.toLowerCase()) {
    case FormEnctype.multipart:
      return FormEnctype.multipart

    case FormEnctype.plain:
      return FormEnctype.plain

    default:
      return FormEnctype.urlEncoded
  }
}

class FormSubmission {
  constructor (delegate, formElement, submitter, mustRedirect = false) {
    this.state = FormSubmissionState.initialized
    this.delegate = delegate
    this.formElement = formElement
    this.submitter = submitter
    this.formData = buildFormData(formElement, submitter)
    this.location = expandURL(this.action)
    if (this.method == FetchMethod.get) {
      mergeFormDataEntries(this.location, [...this.body.entries()])
    }
    this.fetchRequest = new FetchRequest(this, this.method, this.location, this.body, this.formElement)
    this.mustRedirect = mustRedirect
  }

  static confirmMethod (message, _element, _submitter) {
    return Promise.resolve(confirm(message))
  }

  get method () {
    let _a
    const method = ((_a = this.submitter) === null || _a === void 0 ? void 0 : _a.getAttribute('formmethod')) || this.formElement.getAttribute('method') || ''
    return fetchMethodFromString(method.toLowerCase()) || FetchMethod.get
  }

  get action () {
    let _a
    const formElementAction = typeof this.formElement.action === 'string' ? this.formElement.action : null
    if ((_a = this.submitter) === null || _a === void 0 ? void 0 : _a.hasAttribute('formaction')) {
      return this.submitter.getAttribute('formaction') || ''
    } else {
      return this.formElement.getAttribute('action') || formElementAction || ''
    }
  }

  get body () {
    if (this.enctype == FormEnctype.urlEncoded || this.method == FetchMethod.get) {
      return new URLSearchParams(this.stringFormData)
    } else {
      return this.formData
    }
  }

  get enctype () {
    let _a
    return formEnctypeFromString(((_a = this.submitter) === null || _a === void 0 ? void 0 : _a.getAttribute('formenctype')) || this.formElement.enctype)
  }

  get isIdempotent () {
    return this.fetchRequest.isIdempotent
  }

  get stringFormData () {
    return [...this.formData].reduce((entries, [name, value]) => entries.concat(typeof value === 'string' ? [[name, value]] : []), [])
  }

  async start () {
    const { initialized, requesting } = FormSubmissionState
    const confirmationMessage = getAttribute('data-turbo-confirm', this.submitter, this.formElement)
    if (typeof confirmationMessage === 'string') {
      const answer = await FormSubmission.confirmMethod(confirmationMessage, this.formElement, this.submitter)
      if (!answer) {
        return
      }
    }
    if (this.state == initialized) {
      this.state = requesting
      return this.fetchRequest.perform()
    }
  }

  stop () {
    const { stopping, stopped } = FormSubmissionState
    if (this.state != stopping && this.state != stopped) {
      this.state = stopping
      this.fetchRequest.cancel()
      return true
    }
  }

  prepareHeadersForRequest (headers, request) {
    if (!request.isIdempotent) {
      const token = getCookieValue(getMetaContent('csrf-param')) || getMetaContent('csrf-token')
      if (token) {
        headers['X-CSRF-Token'] = token
      }
    }
    if (this.requestAcceptsTurboStreamResponse(request)) {
      request.acceptResponseType(StreamMessage.contentType)
    }
  }

  requestStarted (_request) {
    let _a
    this.state = FormSubmissionState.waiting;
    (_a = this.submitter) === null || _a === void 0 ? void 0 : _a.setAttribute('disabled', '')
    dispatch$1('turbo:submit-start', {
      target: this.formElement,
      detail: {
        formSubmission: this
      }
    })
    this.delegate.formSubmissionStarted(this)
  }

  requestPreventedHandlingResponse (request, response) {
    this.result = {
      success: response.succeeded,
      fetchResponse: response
    }
  }

  requestSucceededWithResponse (request, response) {
    if (response.clientError || response.serverError) {
      this.delegate.formSubmissionFailedWithResponse(this, response)
    } else if (this.requestMustRedirect(request) && responseSucceededWithoutRedirect(response)) {
      const error = new Error('Form responses must redirect to another location')
      this.delegate.formSubmissionErrored(this, error)
    } else {
      this.state = FormSubmissionState.receiving
      this.result = {
        success: true,
        fetchResponse: response
      }
      this.delegate.formSubmissionSucceededWithResponse(this, response)
    }
  }

  requestFailedWithResponse (request, response) {
    this.result = {
      success: false,
      fetchResponse: response
    }
    this.delegate.formSubmissionFailedWithResponse(this, response)
  }

  requestErrored (request, error) {
    this.result = {
      success: false,
      error
    }
    this.delegate.formSubmissionErrored(this, error)
  }

  requestFinished (_request) {
    let _a
    this.state = FormSubmissionState.stopped;
    (_a = this.submitter) === null || _a === void 0 ? void 0 : _a.removeAttribute('disabled')
    dispatch$1('turbo:submit-end', {
      target: this.formElement,
      detail: Object.assign({
        formSubmission: this
      }, this.result)
    })
    this.delegate.formSubmissionFinished(this)
  }

  requestMustRedirect (request) {
    return !request.isIdempotent && this.mustRedirect
  }

  requestAcceptsTurboStreamResponse (request) {
    return !request.isIdempotent || hasAttribute('data-turbo-stream', this.submitter, this.formElement)
  }
}

function buildFormData (formElement, submitter) {
  const formData = new FormData(formElement)
  const name = submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute('name')
  const value = submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute('value')
  if (name) {
    formData.append(name, value || '')
  }
  return formData
}

function getCookieValue (cookieName) {
  if (cookieName != null) {
    const cookies = document.cookie ? document.cookie.split('; ') : []
    const cookie = cookies.find(cookie => cookie.startsWith(cookieName))
    if (cookie) {
      const value = cookie.split('=').slice(1).join('=')
      return value ? decodeURIComponent(value) : undefined
    }
  }
}

function responseSucceededWithoutRedirect (response) {
  return response.statusCode == 200 && !response.redirected
}

function mergeFormDataEntries (url, entries) {
  const searchParams = new URLSearchParams()
  for (const [name, value] of entries) {
    if (value instanceof File) continue
    searchParams.append(name, value)
  }
  url.search = searchParams.toString()
  return url
}

class Snapshot {
  constructor (element) {
    this.element = element
  }

  get activeElement () {
    return this.element.ownerDocument.activeElement
  }

  get children () {
    return [...this.element.children]
  }

  hasAnchor (anchor) {
    return this.getElementForAnchor(anchor) != null
  }

  getElementForAnchor (anchor) {
    return anchor ? this.element.querySelector(`[id='${anchor}'], a[name='${anchor}']`) : null
  }

  get isConnected () {
    return this.element.isConnected
  }

  get firstAutofocusableElement () {
    const inertDisabledOrHidden = '[inert], :disabled, [hidden], details:not([open]), dialog:not([open])'
    for (const element of this.element.querySelectorAll('[autofocus]')) {
      if (element.closest(inertDisabledOrHidden) == null) return element; else continue
    }
    return null
  }

  get permanentElements () {
    return queryPermanentElementsAll(this.element)
  }

  getPermanentElementById (id) {
    return getPermanentElementById(this.element, id)
  }

  getPermanentElementMapForSnapshot (snapshot) {
    const permanentElementMap = {}
    for (const currentPermanentElement of this.permanentElements) {
      const { id } = currentPermanentElement
      const newPermanentElement = snapshot.getPermanentElementById(id)
      if (newPermanentElement) {
        permanentElementMap[id] = [currentPermanentElement, newPermanentElement]
      }
    }
    return permanentElementMap
  }
}

function getPermanentElementById (node, id) {
  return node.querySelector(`#${id}[data-turbo-permanent]`)
}

function queryPermanentElementsAll (node) {
  return node.querySelectorAll('[id][data-turbo-permanent]')
}

class FormSubmitObserver {
  constructor (delegate, eventTarget) {
    this.started = false
    this.submitCaptured = () => {
      this.eventTarget.removeEventListener('submit', this.submitBubbled, false)
      this.eventTarget.addEventListener('submit', this.submitBubbled, false)
    }
    this.submitBubbled = event => {
      if (!event.defaultPrevented) {
        const form = event.target instanceof HTMLFormElement ? event.target : undefined
        const submitter = event.submitter || undefined
        if (form && submissionDoesNotDismissDialog(form, submitter) && submissionDoesNotTargetIFrame(form, submitter) && this.delegate.willSubmitForm(form, submitter)) {
          event.preventDefault()
          event.stopImmediatePropagation()
          this.delegate.formSubmitted(form, submitter)
        }
      }
    }
    this.delegate = delegate
    this.eventTarget = eventTarget
  }

  start () {
    if (!this.started) {
      this.eventTarget.addEventListener('submit', this.submitCaptured, true)
      this.started = true
    }
  }

  stop () {
    if (this.started) {
      this.eventTarget.removeEventListener('submit', this.submitCaptured, true)
      this.started = false
    }
  }
}

function submissionDoesNotDismissDialog (form, submitter) {
  const method = (submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute('formmethod')) || form.getAttribute('method')
  return method != 'dialog'
}

function submissionDoesNotTargetIFrame (form, submitter) {
  const target = (submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute('formtarget')) || form.target
  for (const element of document.getElementsByName(target)) {
    if (element instanceof HTMLIFrameElement) return false
  }
  return true
}

class View {
  constructor (delegate, element) {
    this.resolveRenderPromise = _value => {}
    this.resolveInterceptionPromise = _value => {}
    this.delegate = delegate
    this.element = element
  }

  scrollToAnchor (anchor) {
    const element = this.snapshot.getElementForAnchor(anchor)
    if (element) {
      this.scrollToElement(element)
      this.focusElement(element)
    } else {
      this.scrollToPosition({
        x: 0,
        y: 0
      })
    }
  }

  scrollToAnchorFromLocation (location) {
    this.scrollToAnchor(getAnchor(location))
  }

  scrollToElement (element) {
    element.scrollIntoView()
  }

  focusElement (element) {
    if (element instanceof HTMLElement) {
      if (element.hasAttribute('tabindex')) {
        element.focus()
      } else {
        element.setAttribute('tabindex', '-1')
        element.focus()
        element.removeAttribute('tabindex')
      }
    }
  }

  scrollToPosition ({ x, y }) {
    this.scrollRoot.scrollTo(x, y)
  }

  scrollToTop () {
    this.scrollToPosition({
      x: 0,
      y: 0
    })
  }

  get scrollRoot () {
    return window
  }

  async render (renderer) {
    const { isPreview, shouldRender, newSnapshot: snapshot } = renderer
    if (shouldRender) {
      try {
        this.renderPromise = new Promise(resolve => this.resolveRenderPromise = resolve)
        this.renderer = renderer
        await this.prepareToRenderSnapshot(renderer)
        const renderInterception = new Promise(resolve => this.resolveInterceptionPromise = resolve)
        const options = {
          resume: this.resolveInterceptionPromise,
          render: this.renderer.renderElement
        }
        const immediateRender = this.delegate.allowsImmediateRender(snapshot, options)
        if (!immediateRender) await renderInterception
        await this.renderSnapshot(renderer)
        this.delegate.viewRenderedSnapshot(snapshot, isPreview)
        this.delegate.preloadOnLoadLinksForView(this.element)
        this.finishRenderingSnapshot(renderer)
      } finally {
        delete this.renderer
        this.resolveRenderPromise(undefined)
        delete this.renderPromise
      }
    } else {
      this.invalidate(renderer.reloadReason)
    }
  }

  invalidate (reason) {
    this.delegate.viewInvalidated(reason)
  }

  async prepareToRenderSnapshot (renderer) {
    this.markAsPreview(renderer.isPreview)
    await renderer.prepareToRender()
  }

  markAsPreview (isPreview) {
    if (isPreview) {
      this.element.setAttribute('data-turbo-preview', '')
    } else {
      this.element.removeAttribute('data-turbo-preview')
    }
  }

  async renderSnapshot (renderer) {
    await renderer.render()
  }

  finishRenderingSnapshot (renderer) {
    renderer.finishRendering()
  }
}

class FrameView extends View {
  invalidate () {
    this.element.innerHTML = ''
  }

  get snapshot () {
    return new Snapshot(this.element)
  }
}

class LinkInterceptor {
  constructor (delegate, element) {
    this.clickBubbled = event => {
      if (this.respondsToEventTarget(event.target)) {
        this.clickEvent = event
      } else {
        delete this.clickEvent
      }
    }
    this.linkClicked = event => {
      if (this.clickEvent && this.respondsToEventTarget(event.target) && event.target instanceof Element) {
        if (this.delegate.shouldInterceptLinkClick(event.target, event.detail.url, event.detail.originalEvent)) {
          this.clickEvent.preventDefault()
          event.preventDefault()
          this.delegate.linkClickIntercepted(event.target, event.detail.url, event.detail.originalEvent)
        }
      }
      delete this.clickEvent
    }
    this.willVisit = _event => {
      delete this.clickEvent
    }
    this.delegate = delegate
    this.element = element
  }

  start () {
    this.element.addEventListener('click', this.clickBubbled)
    document.addEventListener('turbo:click', this.linkClicked)
    document.addEventListener('turbo:before-visit', this.willVisit)
  }

  stop () {
    this.element.removeEventListener('click', this.clickBubbled)
    document.removeEventListener('turbo:click', this.linkClicked)
    document.removeEventListener('turbo:before-visit', this.willVisit)
  }

  respondsToEventTarget (target) {
    const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null
    return element && element.closest('turbo-frame, html') == this.element
  }
}

class LinkClickObserver {
  constructor (delegate, eventTarget) {
    this.started = false
    this.clickCaptured = () => {
      this.eventTarget.removeEventListener('click', this.clickBubbled, false)
      this.eventTarget.addEventListener('click', this.clickBubbled, false)
    }
    this.clickBubbled = event => {
      if (event instanceof MouseEvent && this.clickEventIsSignificant(event)) {
        const target = event.composedPath && event.composedPath()[0] || event.target
        const link = this.findLinkFromClickTarget(target)
        if (link && doesNotTargetIFrame(link)) {
          const location = this.getLocationForLink(link)
          if (this.delegate.willFollowLinkToLocation(link, location, event)) {
            event.preventDefault()
            this.delegate.followedLinkToLocation(link, location)
          }
        }
      }
    }
    this.delegate = delegate
    this.eventTarget = eventTarget
  }

  start () {
    if (!this.started) {
      this.eventTarget.addEventListener('click', this.clickCaptured, true)
      this.started = true
    }
  }

  stop () {
    if (this.started) {
      this.eventTarget.removeEventListener('click', this.clickCaptured, true)
      this.started = false
    }
  }

  clickEventIsSignificant (event) {
    return !(event.target && event.target.isContentEditable || event.defaultPrevented || event.which > 1 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
  }

  findLinkFromClickTarget (target) {
    if (target instanceof Element) {
      return target.closest('a[href]:not([target^=_]):not([download])')
    }
  }

  getLocationForLink (link) {
    return expandURL(link.getAttribute('href') || '')
  }
}

function doesNotTargetIFrame (anchor) {
  for (const element of document.getElementsByName(anchor.target)) {
    if (element instanceof HTMLIFrameElement) return false
  }
  return true
}

class FormLinkClickObserver {
  constructor (delegate, element) {
    this.delegate = delegate
    this.linkInterceptor = new LinkClickObserver(this, element)
  }

  start () {
    this.linkInterceptor.start()
  }

  stop () {
    this.linkInterceptor.stop()
  }

  willFollowLinkToLocation (link, location, originalEvent) {
    return this.delegate.willSubmitFormLinkToLocation(link, location, originalEvent) && link.hasAttribute('data-turbo-method')
  }

  followedLinkToLocation (link, location) {
    const action = location.href
    const form = document.createElement('form')
    form.setAttribute('data-turbo', 'true')
    form.setAttribute('action', action)
    form.setAttribute('hidden', '')
    const method = link.getAttribute('data-turbo-method')
    if (method) form.setAttribute('method', method)
    const turboFrame = link.getAttribute('data-turbo-frame')
    if (turboFrame) form.setAttribute('data-turbo-frame', turboFrame)
    const turboAction = link.getAttribute('data-turbo-action')
    if (turboAction) form.setAttribute('data-turbo-action', turboAction)
    const turboConfirm = link.getAttribute('data-turbo-confirm')
    if (turboConfirm) form.setAttribute('data-turbo-confirm', turboConfirm)
    const turboStream = link.hasAttribute('data-turbo-stream')
    if (turboStream) form.setAttribute('data-turbo-stream', '')
    this.delegate.submittedFormLinkToLocation(link, location, form)
    document.body.appendChild(form)
    form.addEventListener('turbo:submit-end', () => form.remove(), {
      once: true
    })
    requestAnimationFrame(() => form.requestSubmit())
  }
}

class Bardo {
  constructor (delegate, permanentElementMap) {
    this.delegate = delegate
    this.permanentElementMap = permanentElementMap
  }

  static preservingPermanentElements (delegate, permanentElementMap, callback) {
    const bardo = new this(delegate, permanentElementMap)
    bardo.enter()
    callback()
    bardo.leave()
  }

  enter () {
    for (const id in this.permanentElementMap) {
      const [currentPermanentElement, newPermanentElement] = this.permanentElementMap[id]
      this.delegate.enteringBardo(currentPermanentElement, newPermanentElement)
      this.replaceNewPermanentElementWithPlaceholder(newPermanentElement)
    }
  }

  leave () {
    for (const id in this.permanentElementMap) {
      const [currentPermanentElement] = this.permanentElementMap[id]
      this.replaceCurrentPermanentElementWithClone(currentPermanentElement)
      this.replacePlaceholderWithPermanentElement(currentPermanentElement)
      this.delegate.leavingBardo(currentPermanentElement)
    }
  }

  replaceNewPermanentElementWithPlaceholder (permanentElement) {
    const placeholder = createPlaceholderForPermanentElement(permanentElement)
    permanentElement.replaceWith(placeholder)
  }

  replaceCurrentPermanentElementWithClone (permanentElement) {
    const clone = permanentElement.cloneNode(true)
    permanentElement.replaceWith(clone)
  }

  replacePlaceholderWithPermanentElement (permanentElement) {
    const placeholder = this.getPlaceholderById(permanentElement.id)
    placeholder === null || placeholder === void 0 ? void 0 : placeholder.replaceWith(permanentElement)
  }

  getPlaceholderById (id) {
    return this.placeholders.find(element => element.content == id)
  }

  get placeholders () {
    return [...document.querySelectorAll('meta[name=turbo-permanent-placeholder][content]')]
  }
}

function createPlaceholderForPermanentElement (permanentElement) {
  const element = document.createElement('meta')
  element.setAttribute('name', 'turbo-permanent-placeholder')
  element.setAttribute('content', permanentElement.id)
  return element
}

class Renderer {
  constructor (currentSnapshot, newSnapshot, renderElement, isPreview, willRender = true) {
    this.activeElement = null
    this.currentSnapshot = currentSnapshot
    this.newSnapshot = newSnapshot
    this.isPreview = isPreview
    this.willRender = willRender
    this.renderElement = renderElement
    this.promise = new Promise((resolve, reject) => this.resolvingFunctions = {
      resolve,
      reject
    })
  }

  get shouldRender () {
    return true
  }

  get reloadReason () {

  }

  prepareToRender () {

  }

  finishRendering () {
    if (this.resolvingFunctions) {
      this.resolvingFunctions.resolve()
      delete this.resolvingFunctions
    }
  }

  preservingPermanentElements (callback) {
    Bardo.preservingPermanentElements(this, this.permanentElementMap, callback)
  }

  focusFirstAutofocusableElement () {
    const element = this.connectedSnapshot.firstAutofocusableElement
    if (elementIsFocusable(element)) {
      element.focus()
    }
  }

  enteringBardo (currentPermanentElement) {
    if (this.activeElement) return
    if (currentPermanentElement.contains(this.currentSnapshot.activeElement)) {
      this.activeElement = this.currentSnapshot.activeElement
    }
  }

  leavingBardo (currentPermanentElement) {
    if (currentPermanentElement.contains(this.activeElement) && this.activeElement instanceof HTMLElement) {
      this.activeElement.focus()
      this.activeElement = null
    }
  }

  get connectedSnapshot () {
    return this.newSnapshot.isConnected ? this.newSnapshot : this.currentSnapshot
  }

  get currentElement () {
    return this.currentSnapshot.element
  }

  get newElement () {
    return this.newSnapshot.element
  }

  get permanentElementMap () {
    return this.currentSnapshot.getPermanentElementMapForSnapshot(this.newSnapshot)
  }
}

function elementIsFocusable (element) {
  return element && typeof element.focus === 'function'
}

class FrameRenderer extends Renderer {
  constructor (delegate, currentSnapshot, newSnapshot, renderElement, isPreview, willRender = true) {
    super(currentSnapshot, newSnapshot, renderElement, isPreview, willRender)
    this.delegate = delegate
  }

  static renderElement (currentElement, newElement) {
    let _a
    const destinationRange = document.createRange()
    destinationRange.selectNodeContents(currentElement)
    destinationRange.deleteContents()
    const frameElement = newElement
    const sourceRange = (_a = frameElement.ownerDocument) === null || _a === void 0 ? void 0 : _a.createRange()
    if (sourceRange) {
      sourceRange.selectNodeContents(frameElement)
      currentElement.appendChild(sourceRange.extractContents())
    }
  }

  get shouldRender () {
    return true
  }

  async render () {
    await nextAnimationFrame()
    this.preservingPermanentElements(() => {
      this.loadFrameElement()
    })
    this.scrollFrameIntoView()
    await nextAnimationFrame()
    this.focusFirstAutofocusableElement()
    await nextAnimationFrame()
    this.activateScriptElements()
  }

  loadFrameElement () {
    this.delegate.willRenderFrame(this.currentElement, this.newElement)
    this.renderElement(this.currentElement, this.newElement)
  }

  scrollFrameIntoView () {
    if (this.currentElement.autoscroll || this.newElement.autoscroll) {
      const element = this.currentElement.firstElementChild
      const block = readScrollLogicalPosition(this.currentElement.getAttribute('data-autoscroll-block'), 'end')
      const behavior = readScrollBehavior(this.currentElement.getAttribute('data-autoscroll-behavior'), 'auto')
      if (element) {
        element.scrollIntoView({
          block,
          behavior
        })
        return true
      }
    }
    return false
  }

  activateScriptElements () {
    for (const inertScriptElement of this.newScriptElements) {
      const activatedScriptElement = activateScriptElement(inertScriptElement)
      inertScriptElement.replaceWith(activatedScriptElement)
    }
  }

  get newScriptElements () {
    return this.currentElement.querySelectorAll('script')
  }
}

function readScrollLogicalPosition (value, defaultValue) {
  if (value == 'end' || value == 'start' || value == 'center' || value == 'nearest') {
    return value
  } else {
    return defaultValue
  }
}

function readScrollBehavior (value, defaultValue) {
  if (value == 'auto' || value == 'smooth') {
    return value
  } else {
    return defaultValue
  }
}

class ProgressBar {
  constructor () {
    this.hiding = false
    this.value = 0
    this.visible = false
    this.trickle = () => {
      this.setValue(this.value + Math.random() / 100)
    }
    this.stylesheetElement = this.createStylesheetElement()
    this.progressElement = this.createProgressElement()
    this.installStylesheetElement()
    this.setValue(0)
  }

  static get defaultCSS () {
    return unindent`
      .turbo-progress-bar {
        position: fixed;
        display: block;
        top: 0;
        left: 0;
        height: 3px;
        background: #0076ff;
        z-index: 2147483647;
        transition:
          width ${ProgressBar.animationDuration}ms ease-out,
          opacity ${ProgressBar.animationDuration / 2}ms ${ProgressBar.animationDuration / 2}ms ease-in;
        transform: translate3d(0, 0, 0);
      }
    `
  }

  show () {
    if (!this.visible) {
      this.visible = true
      this.installProgressElement()
      this.startTrickling()
    }
  }

  hide () {
    if (this.visible && !this.hiding) {
      this.hiding = true
      this.fadeProgressElement(() => {
        this.uninstallProgressElement()
        this.stopTrickling()
        this.visible = false
        this.hiding = false
      })
    }
  }

  setValue (value) {
    this.value = value
    this.refresh()
  }

  installStylesheetElement () {
    document.head.insertBefore(this.stylesheetElement, document.head.firstChild)
  }

  installProgressElement () {
    this.progressElement.style.width = '0'
    this.progressElement.style.opacity = '1'
    document.documentElement.insertBefore(this.progressElement, document.body)
    this.refresh()
  }

  fadeProgressElement (callback) {
    this.progressElement.style.opacity = '0'
    setTimeout(callback, ProgressBar.animationDuration * 1.5)
  }

  uninstallProgressElement () {
    if (this.progressElement.parentNode) {
      document.documentElement.removeChild(this.progressElement)
    }
  }

  startTrickling () {
    if (!this.trickleInterval) {
      this.trickleInterval = window.setInterval(this.trickle, ProgressBar.animationDuration)
    }
  }

  stopTrickling () {
    window.clearInterval(this.trickleInterval)
    delete this.trickleInterval
  }

  refresh () {
    requestAnimationFrame(() => {
      this.progressElement.style.width = `${10 + this.value * 90}%`
    })
  }

  createStylesheetElement () {
    const element = document.createElement('style')
    element.type = 'text/css'
    element.textContent = ProgressBar.defaultCSS
    if (this.cspNonce) {
      element.nonce = this.cspNonce
    }
    return element
  }

  createProgressElement () {
    const element = document.createElement('div')
    element.className = 'turbo-progress-bar'
    return element
  }

  get cspNonce () {
    return getMetaContent('csp-nonce')
  }
}

ProgressBar.animationDuration = 300

class HeadSnapshot extends Snapshot {
  constructor () {
    super(...arguments)
    this.detailsByOuterHTML = this.children.filter(element => !elementIsNoscript(element)).map(element => elementWithoutNonce(element)).reduce((result, element) => {
      const { outerHTML } = element
      const details = outerHTML in result
        ? result[outerHTML]
        : {
            type: elementType(element),
            tracked: elementIsTracked(element),
            elements: []
          }
      return Object.assign(Object.assign({}, result), {
        [outerHTML]: Object.assign(Object.assign({}, details), {
          elements: [...details.elements, element]
        })
      })
    }, {})
  }

  get trackedElementSignature () {
    return Object.keys(this.detailsByOuterHTML).filter(outerHTML => this.detailsByOuterHTML[outerHTML].tracked).join('')
  }

  getScriptElementsNotInSnapshot (snapshot) {
    return this.getElementsMatchingTypeNotInSnapshot('script', snapshot)
  }

  getStylesheetElementsNotInSnapshot (snapshot) {
    return this.getElementsMatchingTypeNotInSnapshot('stylesheet', snapshot)
  }

  getElementsMatchingTypeNotInSnapshot (matchedType, snapshot) {
    return Object.keys(this.detailsByOuterHTML).filter(outerHTML => !(outerHTML in snapshot.detailsByOuterHTML)).map(outerHTML => this.detailsByOuterHTML[outerHTML]).filter(({ type }) => type == matchedType).map(({ elements: [element] }) => element)
  }

  get provisionalElements () {
    return Object.keys(this.detailsByOuterHTML).reduce((result, outerHTML) => {
      const { type, tracked, elements } = this.detailsByOuterHTML[outerHTML]
      if (type == null && !tracked) {
        return [...result, ...elements]
      } else if (elements.length > 1) {
        return [...result, ...elements.slice(1)]
      } else {
        return result
      }
    }, [])
  }

  getMetaValue (name) {
    const element = this.findMetaElementByName(name)
    return element ? element.getAttribute('content') : null
  }

  findMetaElementByName (name) {
    return Object.keys(this.detailsByOuterHTML).reduce((result, outerHTML) => {
      const { elements: [element] } = this.detailsByOuterHTML[outerHTML]
      return elementIsMetaElementWithName(element, name) ? element : result
    }, undefined)
  }
}

function elementType (element) {
  if (elementIsScript(element)) {
    return 'script'
  } else if (elementIsStylesheet(element)) {
    return 'stylesheet'
  }
}

function elementIsTracked (element) {
  return element.getAttribute('data-turbo-track') == 'reload'
}

function elementIsScript (element) {
  const tagName = element.localName
  return tagName == 'script'
}

function elementIsNoscript (element) {
  const tagName = element.localName
  return tagName == 'noscript'
}

function elementIsStylesheet (element) {
  const tagName = element.localName
  return tagName == 'style' || tagName == 'link' && element.getAttribute('rel') == 'stylesheet'
}

function elementIsMetaElementWithName (element, name) {
  const tagName = element.localName
  return tagName == 'meta' && element.getAttribute('name') == name
}

function elementWithoutNonce (element) {
  if (element.hasAttribute('nonce')) {
    element.setAttribute('nonce', '')
  }
  return element
}

class PageSnapshot extends Snapshot {
  constructor (element, headSnapshot) {
    super(element)
    this.headSnapshot = headSnapshot
  }

  static fromHTMLString (html = '') {
    return this.fromDocument(parseHTMLDocument(html))
  }

  static fromElement (element) {
    return this.fromDocument(element.ownerDocument)
  }

  static fromDocument ({ head, body }) {
    return new this(body, new HeadSnapshot(head))
  }

  clone () {
    const clonedElement = this.element.cloneNode(true)
    const selectElements = this.element.querySelectorAll('select')
    const clonedSelectElements = clonedElement.querySelectorAll('select')
    for (const [index, source] of selectElements.entries()) {
      const clone = clonedSelectElements[index]
      for (const option of clone.selectedOptions) option.selected = false
      for (const option of source.selectedOptions) clone.options[option.index].selected = true
    }
    for (const clonedPasswordInput of clonedElement.querySelectorAll('input[type="password"]')) {
      clonedPasswordInput.value = ''
    }
    return new PageSnapshot(clonedElement, this.headSnapshot)
  }

  get headElement () {
    return this.headSnapshot.element
  }

  get rootLocation () {
    let _a
    const root = (_a = this.getSetting('root')) !== null && _a !== void 0 ? _a : '/'
    return expandURL(root)
  }

  get cacheControlValue () {
    return this.getSetting('cache-control')
  }

  get isPreviewable () {
    return this.cacheControlValue != 'no-preview'
  }

  get isCacheable () {
    return this.cacheControlValue != 'no-cache'
  }

  get isVisitable () {
    return this.getSetting('visit-control') != 'reload'
  }

  getSetting (name) {
    return this.headSnapshot.getMetaValue(`turbo-${name}`)
  }
}

let TimingMetric;

(function (TimingMetric) {
  TimingMetric.visitStart = 'visitStart'
  TimingMetric.requestStart = 'requestStart'
  TimingMetric.requestEnd = 'requestEnd'
  TimingMetric.visitEnd = 'visitEnd'
})(TimingMetric || (TimingMetric = {}))

let VisitState;

(function (VisitState) {
  VisitState.initialized = 'initialized'
  VisitState.started = 'started'
  VisitState.canceled = 'canceled'
  VisitState.failed = 'failed'
  VisitState.completed = 'completed'
})(VisitState || (VisitState = {}))

const defaultOptions = {
  action: 'advance',
  historyChanged: false,
  visitCachedSnapshot: () => {},
  willRender: true,
  updateHistory: true,
  shouldCacheSnapshot: true,
  acceptsStreamResponse: false
}

let SystemStatusCode;

(function (SystemStatusCode) {
  SystemStatusCode[SystemStatusCode.networkFailure = 0] = 'networkFailure'
  SystemStatusCode[SystemStatusCode.timeoutFailure = -1] = 'timeoutFailure'
  SystemStatusCode[SystemStatusCode.contentTypeMismatch = -2] = 'contentTypeMismatch'
})(SystemStatusCode || (SystemStatusCode = {}))

class Visit {
  constructor (delegate, location, restorationIdentifier, options = {}) {
    this.identifier = uuid()
    this.timingMetrics = {}
    this.followedRedirect = false
    this.historyChanged = false
    this.scrolled = false
    this.shouldCacheSnapshot = true
    this.acceptsStreamResponse = false
    this.snapshotCached = false
    this.state = VisitState.initialized
    this.delegate = delegate
    this.location = location
    this.restorationIdentifier = restorationIdentifier || uuid()
    const { action, historyChanged, referrer, snapshot, snapshotHTML, response, visitCachedSnapshot, willRender, updateHistory, shouldCacheSnapshot, acceptsStreamResponse } = Object.assign(Object.assign({}, defaultOptions), options)
    this.action = action
    this.historyChanged = historyChanged
    this.referrer = referrer
    this.snapshot = snapshot
    this.snapshotHTML = snapshotHTML
    this.response = response
    this.isSamePage = this.delegate.locationWithActionIsSamePage(this.location, this.action)
    this.visitCachedSnapshot = visitCachedSnapshot
    this.willRender = willRender
    this.updateHistory = updateHistory
    this.scrolled = !willRender
    this.shouldCacheSnapshot = shouldCacheSnapshot
    this.acceptsStreamResponse = acceptsStreamResponse
  }

  get adapter () {
    return this.delegate.adapter
  }

  get view () {
    return this.delegate.view
  }

  get history () {
    return this.delegate.history
  }

  get restorationData () {
    return this.history.getRestorationDataForIdentifier(this.restorationIdentifier)
  }

  get silent () {
    return this.isSamePage
  }

  start () {
    if (this.state == VisitState.initialized) {
      this.recordTimingMetric(TimingMetric.visitStart)
      this.state = VisitState.started
      this.adapter.visitStarted(this)
      this.delegate.visitStarted(this)
    }
  }

  cancel () {
    if (this.state == VisitState.started) {
      if (this.request) {
        this.request.cancel()
      }
      this.cancelRender()
      this.state = VisitState.canceled
    }
  }

  complete () {
    if (this.state == VisitState.started) {
      this.recordTimingMetric(TimingMetric.visitEnd)
      this.state = VisitState.completed
      this.followRedirect()
      if (!this.followedRedirect) {
        this.adapter.visitCompleted(this)
        this.delegate.visitCompleted(this)
      }
    }
  }

  fail () {
    if (this.state == VisitState.started) {
      this.state = VisitState.failed
      this.adapter.visitFailed(this)
    }
  }

  changeHistory () {
    let _a
    if (!this.historyChanged && this.updateHistory) {
      const actionForHistory = this.location.href === ((_a = this.referrer) === null || _a === void 0 ? void 0 : _a.href) ? 'replace' : this.action
      const method = getHistoryMethodForAction(actionForHistory)
      this.history.update(method, this.location, this.restorationIdentifier)
      this.historyChanged = true
    }
  }

  issueRequest () {
    if (this.hasPreloadedResponse()) {
      this.simulateRequest()
    } else if (this.shouldIssueRequest() && !this.request) {
      this.request = new FetchRequest(this, FetchMethod.get, this.location)
      this.request.perform()
    }
  }

  simulateRequest () {
    if (this.response) {
      this.startRequest()
      this.recordResponse()
      this.finishRequest()
    }
  }

  startRequest () {
    this.recordTimingMetric(TimingMetric.requestStart)
    this.adapter.visitRequestStarted(this)
  }

  recordResponse (response = this.response) {
    this.response = response
    if (response) {
      const { statusCode } = response
      if (isSuccessful(statusCode)) {
        this.adapter.visitRequestCompleted(this)
      } else {
        this.adapter.visitRequestFailedWithStatusCode(this, statusCode)
      }
    }
  }

  finishRequest () {
    this.recordTimingMetric(TimingMetric.requestEnd)
    this.adapter.visitRequestFinished(this)
  }

  loadResponse () {
    if (this.response) {
      const { statusCode, responseHTML } = this.response
      this.render(async () => {
        if (this.shouldCacheSnapshot) this.cacheSnapshot()
        if (this.view.renderPromise) await this.view.renderPromise
        if (isSuccessful(statusCode) && responseHTML != null) {
          await this.view.renderPage(PageSnapshot.fromHTMLString(responseHTML), false, this.willRender, this)
          this.performScroll()
          this.adapter.visitRendered(this)
          this.complete()
        } else {
          await this.view.renderError(PageSnapshot.fromHTMLString(responseHTML), this)
          this.adapter.visitRendered(this)
          this.fail()
        }
      })
    }
  }

  getCachedSnapshot () {
    const snapshot = this.view.getCachedSnapshotForLocation(this.location) || this.getPreloadedSnapshot()
    if (snapshot && (!getAnchor(this.location) || snapshot.hasAnchor(getAnchor(this.location)))) {
      if (this.action == 'restore' || snapshot.isPreviewable) {
        return snapshot
      }
    }
  }

  getPreloadedSnapshot () {
    if (this.snapshotHTML) {
      return PageSnapshot.fromHTMLString(this.snapshotHTML)
    }
  }

  hasCachedSnapshot () {
    return this.getCachedSnapshot() != null
  }

  loadCachedSnapshot () {
    const snapshot = this.getCachedSnapshot()
    if (snapshot) {
      const isPreview = this.shouldIssueRequest()
      this.render(async () => {
        this.cacheSnapshot()
        if (this.isSamePage) {
          this.adapter.visitRendered(this)
        } else {
          if (this.view.renderPromise) await this.view.renderPromise
          await this.view.renderPage(snapshot, isPreview, this.willRender, this)
          this.performScroll()
          this.adapter.visitRendered(this)
          if (!isPreview) {
            this.complete()
          }
        }
      })
    }
  }

  followRedirect () {
    let _a
    if (this.redirectedToLocation && !this.followedRedirect && ((_a = this.response) === null || _a === void 0 ? void 0 : _a.redirected)) {
      this.adapter.visitProposedToLocation(this.redirectedToLocation, {
        action: 'replace',
        response: this.response
      })
      this.followedRedirect = true
    }
  }

  goToSamePageAnchor () {
    if (this.isSamePage) {
      this.render(async () => {
        this.cacheSnapshot()
        this.performScroll()
        this.changeHistory()
        this.adapter.visitRendered(this)
      })
    }
  }

  prepareHeadersForRequest (headers, request) {
    if (this.acceptsStreamResponse) {
      request.acceptResponseType(StreamMessage.contentType)
    }
  }

  requestStarted () {
    this.startRequest()
  }

  requestPreventedHandlingResponse (_request, _response) {}
  async requestSucceededWithResponse (request, response) {
    const responseHTML = await response.responseHTML
    const { redirected, statusCode } = response
    if (responseHTML == undefined) {
      this.recordResponse({
        statusCode: SystemStatusCode.contentTypeMismatch,
        redirected
      })
    } else {
      this.redirectedToLocation = response.redirected ? response.location : undefined
      this.recordResponse({
        statusCode,
        responseHTML,
        redirected
      })
    }
  }

  async requestFailedWithResponse (request, response) {
    const responseHTML = await response.responseHTML
    const { redirected, statusCode } = response
    if (responseHTML == undefined) {
      this.recordResponse({
        statusCode: SystemStatusCode.contentTypeMismatch,
        redirected
      })
    } else {
      this.recordResponse({
        statusCode,
        responseHTML,
        redirected
      })
    }
  }

  requestErrored (_request, _error) {
    this.recordResponse({
      statusCode: SystemStatusCode.networkFailure,
      redirected: false
    })
  }

  requestFinished () {
    this.finishRequest()
  }

  performScroll () {
    if (!this.scrolled && !this.view.forceReloaded) {
      if (this.action == 'restore') {
        this.scrollToRestoredPosition() || this.scrollToAnchor() || this.view.scrollToTop()
      } else {
        this.scrollToAnchor() || this.view.scrollToTop()
      }
      if (this.isSamePage) {
        this.delegate.visitScrolledToSamePageLocation(this.view.lastRenderedLocation, this.location)
      }
      this.scrolled = true
    }
  }

  scrollToRestoredPosition () {
    const { scrollPosition } = this.restorationData
    if (scrollPosition) {
      this.view.scrollToPosition(scrollPosition)
      return true
    }
  }

  scrollToAnchor () {
    const anchor = getAnchor(this.location)
    if (anchor != null) {
      this.view.scrollToAnchor(anchor)
      return true
    }
  }

  recordTimingMetric (metric) {
    this.timingMetrics[metric] = (new Date()).getTime()
  }

  getTimingMetrics () {
    return Object.assign({}, this.timingMetrics)
  }

  getHistoryMethodForAction (action) {
    switch (action) {
      case 'replace':
        return history.replaceState

      case 'advance':
      case 'restore':
        return history.pushState
    }
  }

  hasPreloadedResponse () {
    return typeof this.response === 'object'
  }

  shouldIssueRequest () {
    if (this.isSamePage) {
      return false
    } else if (this.action == 'restore') {
      return !this.hasCachedSnapshot()
    } else {
      return this.willRender
    }
  }

  cacheSnapshot () {
    if (!this.snapshotCached) {
      this.view.cacheSnapshot(this.snapshot).then(snapshot => snapshot && this.visitCachedSnapshot(snapshot))
      this.snapshotCached = true
    }
  }

  async render (callback) {
    this.cancelRender()
    await new Promise(resolve => {
      this.frame = requestAnimationFrame(() => resolve())
    })
    await callback()
    delete this.frame
  }

  cancelRender () {
    if (this.frame) {
      cancelAnimationFrame(this.frame)
      delete this.frame
    }
  }
}

function isSuccessful (statusCode) {
  return statusCode >= 200 && statusCode < 300
}

class BrowserAdapter {
  constructor (session) {
    this.progressBar = new ProgressBar()
    this.showProgressBar = () => {
      this.progressBar.show()
    }
    this.session = session
  }

  visitProposedToLocation (location, options) {
    this.navigator.startVisit(location, (options === null || options === void 0 ? void 0 : options.restorationIdentifier) || uuid(), options)
  }

  visitStarted (visit) {
    this.location = visit.location
    visit.loadCachedSnapshot()
    visit.issueRequest()
    visit.goToSamePageAnchor()
  }

  visitRequestStarted (visit) {
    this.progressBar.setValue(0)
    if (visit.hasCachedSnapshot() || visit.action != 'restore') {
      this.showVisitProgressBarAfterDelay()
    } else {
      this.showProgressBar()
    }
  }

  visitRequestCompleted (visit) {
    visit.loadResponse()
  }

  visitRequestFailedWithStatusCode (visit, statusCode) {
    switch (statusCode) {
      case SystemStatusCode.networkFailure:
      case SystemStatusCode.timeoutFailure:
      case SystemStatusCode.contentTypeMismatch:
        return this.reload({
          reason: 'request_failed',
          context: {
            statusCode
          }
        })

      default:
        return visit.loadResponse()
    }
  }

  visitRequestFinished (_visit) {
    this.progressBar.setValue(1)
    this.hideVisitProgressBar()
  }

  visitCompleted (_visit) {}
  pageInvalidated (reason) {
    this.reload(reason)
  }

  visitFailed (_visit) {}
  visitRendered (_visit) {}
  formSubmissionStarted (_formSubmission) {
    this.progressBar.setValue(0)
    this.showFormProgressBarAfterDelay()
  }

  formSubmissionFinished (_formSubmission) {
    this.progressBar.setValue(1)
    this.hideFormProgressBar()
  }

  showVisitProgressBarAfterDelay () {
    this.visitProgressBarTimeout = window.setTimeout(this.showProgressBar, this.session.progressBarDelay)
  }

  hideVisitProgressBar () {
    this.progressBar.hide()
    if (this.visitProgressBarTimeout != null) {
      window.clearTimeout(this.visitProgressBarTimeout)
      delete this.visitProgressBarTimeout
    }
  }

  showFormProgressBarAfterDelay () {
    if (this.formProgressBarTimeout == null) {
      this.formProgressBarTimeout = window.setTimeout(this.showProgressBar, this.session.progressBarDelay)
    }
  }

  hideFormProgressBar () {
    this.progressBar.hide()
    if (this.formProgressBarTimeout != null) {
      window.clearTimeout(this.formProgressBarTimeout)
      delete this.formProgressBarTimeout
    }
  }

  reload (reason) {
    let _a
    dispatch$1('turbo:reload', {
      detail: reason
    })
    window.location.href = ((_a = this.location) === null || _a === void 0 ? void 0 : _a.toString()) || window.location.href
  }

  get navigator () {
    return this.session.navigator
  }
}

class CacheObserver {
  constructor () {
    this.started = false
    this.removeStaleElements = _event => {
      const staleElements = [...document.querySelectorAll('[data-turbo-cache="false"]')]
      for (const element of staleElements) {
        element.remove()
      }
    }
  }

  start () {
    if (!this.started) {
      this.started = true
      addEventListener('turbo:before-cache', this.removeStaleElements, false)
    }
  }

  stop () {
    if (this.started) {
      this.started = false
      removeEventListener('turbo:before-cache', this.removeStaleElements, false)
    }
  }
}

class FrameRedirector {
  constructor (session, element) {
    this.session = session
    this.element = element
    this.linkInterceptor = new LinkInterceptor(this, element)
    this.formSubmitObserver = new FormSubmitObserver(this, element)
  }

  start () {
    this.linkInterceptor.start()
    this.formSubmitObserver.start()
  }

  stop () {
    this.linkInterceptor.stop()
    this.formSubmitObserver.stop()
  }

  shouldInterceptLinkClick (element, _location, _event) {
    return this.shouldRedirect(element)
  }

  linkClickIntercepted (element, url, event) {
    const frame = this.findFrameElement(element)
    if (frame) {
      frame.delegate.linkClickIntercepted(element, url, event)
    }
  }

  willSubmitForm (element, submitter) {
    return element.closest('turbo-frame') == null && this.shouldSubmit(element, submitter) && this.shouldRedirect(element, submitter)
  }

  formSubmitted (element, submitter) {
    const frame = this.findFrameElement(element, submitter)
    if (frame) {
      frame.delegate.formSubmitted(element, submitter)
    }
  }

  shouldSubmit (form, submitter) {
    let _a
    const action = getAction(form, submitter)
    const meta = this.element.ownerDocument.querySelector('meta[name="turbo-root"]')
    const rootLocation = expandURL((_a = meta === null || meta === void 0 ? void 0 : meta.content) !== null && _a !== void 0 ? _a : '/')
    return this.shouldRedirect(form, submitter) && locationIsVisitable(action, rootLocation)
  }

  shouldRedirect (element, submitter) {
    const isNavigatable = element instanceof HTMLFormElement ? this.session.submissionIsNavigatable(element, submitter) : this.session.elementIsNavigatable(element)
    if (isNavigatable) {
      const frame = this.findFrameElement(element, submitter)
      return frame ? frame != element.closest('turbo-frame') : false
    } else {
      return false
    }
  }

  findFrameElement (element, submitter) {
    const id = (submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute('data-turbo-frame')) || element.getAttribute('data-turbo-frame')
    if (id && id != '_top') {
      const frame = this.element.querySelector(`#${id}:not([disabled])`)
      if (frame instanceof FrameElement) {
        return frame
      }
    }
  }
}

class History {
  constructor (delegate) {
    this.restorationIdentifier = uuid()
    this.restorationData = {}
    this.started = false
    this.pageLoaded = false
    this.onPopState = event => {
      if (this.shouldHandlePopState()) {
        const { turbo } = event.state || {}
        if (turbo) {
          this.location = new URL(window.location.href)
          const { restorationIdentifier } = turbo
          this.restorationIdentifier = restorationIdentifier
          this.delegate.historyPoppedToLocationWithRestorationIdentifier(this.location, restorationIdentifier)
        }
      }
    }
    this.onPageLoad = async _event => {
      await nextMicrotask()
      this.pageLoaded = true
    }
    this.delegate = delegate
  }

  start () {
    if (!this.started) {
      addEventListener('popstate', this.onPopState, false)
      addEventListener('load', this.onPageLoad, false)
      this.started = true
      this.replace(new URL(window.location.href))
    }
  }

  stop () {
    if (this.started) {
      removeEventListener('popstate', this.onPopState, false)
      removeEventListener('load', this.onPageLoad, false)
      this.started = false
    }
  }

  push (location, restorationIdentifier) {
    this.update(history.pushState, location, restorationIdentifier)
  }

  replace (location, restorationIdentifier) {
    this.update(history.replaceState, location, restorationIdentifier)
  }

  update (method, location, restorationIdentifier = uuid()) {
    const state = {
      turbo: {
        restorationIdentifier
      }
    }
    method.call(history, state, '', location.href)
    this.location = location
    this.restorationIdentifier = restorationIdentifier
  }

  getRestorationDataForIdentifier (restorationIdentifier) {
    return this.restorationData[restorationIdentifier] || {}
  }

  updateRestorationData (additionalData) {
    const { restorationIdentifier } = this
    const restorationData = this.restorationData[restorationIdentifier]
    this.restorationData[restorationIdentifier] = Object.assign(Object.assign({}, restorationData), additionalData)
  }

  assumeControlOfScrollRestoration () {
    let _a
    if (!this.previousScrollRestoration) {
      this.previousScrollRestoration = (_a = history.scrollRestoration) !== null && _a !== void 0 ? _a : 'auto'
      history.scrollRestoration = 'manual'
    }
  }

  relinquishControlOfScrollRestoration () {
    if (this.previousScrollRestoration) {
      history.scrollRestoration = this.previousScrollRestoration
      delete this.previousScrollRestoration
    }
  }

  shouldHandlePopState () {
    return this.pageIsLoaded()
  }

  pageIsLoaded () {
    return this.pageLoaded || document.readyState == 'complete'
  }
}

class Navigator {
  constructor (delegate) {
    this.delegate = delegate
  }

  proposeVisit (location, options = {}) {
    if (this.delegate.allowsVisitingLocationWithAction(location, options.action)) {
      if (locationIsVisitable(location, this.view.snapshot.rootLocation)) {
        this.delegate.visitProposedToLocation(location, options)
      } else {
        window.location.href = location.toString()
      }
    }
  }

  startVisit (locatable, restorationIdentifier, options = {}) {
    this.stop()
    this.currentVisit = new Visit(this, expandURL(locatable), restorationIdentifier, Object.assign({
      referrer: this.location
    }, options))
    this.currentVisit.start()
  }

  submitForm (form, submitter) {
    this.stop()
    this.formSubmission = new FormSubmission(this, form, submitter, true)
    this.formSubmission.start()
  }

  stop () {
    if (this.formSubmission) {
      this.formSubmission.stop()
      delete this.formSubmission
    }
    if (this.currentVisit) {
      this.currentVisit.cancel()
      delete this.currentVisit
    }
  }

  get adapter () {
    return this.delegate.adapter
  }

  get view () {
    return this.delegate.view
  }

  get history () {
    return this.delegate.history
  }

  formSubmissionStarted (formSubmission) {
    if (typeof this.adapter.formSubmissionStarted === 'function') {
      this.adapter.formSubmissionStarted(formSubmission)
    }
  }

  async formSubmissionSucceededWithResponse (formSubmission, fetchResponse) {
    if (formSubmission == this.formSubmission) {
      const responseHTML = await fetchResponse.responseHTML
      if (responseHTML) {
        const shouldCacheSnapshot = formSubmission.method == FetchMethod.get
        if (!shouldCacheSnapshot) {
          this.view.clearSnapshotCache()
        }
        const { statusCode, redirected } = fetchResponse
        const action = this.getActionForFormSubmission(formSubmission)
        const visitOptions = {
          action,
          shouldCacheSnapshot,
          response: {
            statusCode,
            responseHTML,
            redirected
          }
        }
        this.proposeVisit(fetchResponse.location, visitOptions)
      }
    }
  }

  async formSubmissionFailedWithResponse (formSubmission, fetchResponse) {
    const responseHTML = await fetchResponse.responseHTML
    if (responseHTML) {
      const snapshot = PageSnapshot.fromHTMLString(responseHTML)
      if (fetchResponse.serverError) {
        await this.view.renderError(snapshot, this.currentVisit)
      } else {
        await this.view.renderPage(snapshot, false, true, this.currentVisit)
      }
      this.view.scrollToTop()
      this.view.clearSnapshotCache()
    }
  }

  formSubmissionErrored (formSubmission, error) {
    console.error(error)
  }

  formSubmissionFinished (formSubmission) {
    if (typeof this.adapter.formSubmissionFinished === 'function') {
      this.adapter.formSubmissionFinished(formSubmission)
    }
  }

  visitStarted (visit) {
    this.delegate.visitStarted(visit)
  }

  visitCompleted (visit) {
    this.delegate.visitCompleted(visit)
  }

  locationWithActionIsSamePage (location, action) {
    const anchor = getAnchor(location)
    const currentAnchor = getAnchor(this.view.lastRenderedLocation)
    const isRestorationToTop = action === 'restore' && typeof anchor === 'undefined'
    return action !== 'replace' && getRequestURL(location) === getRequestURL(this.view.lastRenderedLocation) && (isRestorationToTop || anchor != null && anchor !== currentAnchor)
  }

  visitScrolledToSamePageLocation (oldURL, newURL) {
    this.delegate.visitScrolledToSamePageLocation(oldURL, newURL)
  }

  get location () {
    return this.history.location
  }

  get restorationIdentifier () {
    return this.history.restorationIdentifier
  }

  getActionForFormSubmission (formSubmission) {
    const { formElement, submitter } = formSubmission
    const action = getAttribute('data-turbo-action', submitter, formElement)
    return isAction(action) ? action : 'advance'
  }
}

let PageStage;

(function (PageStage) {
  PageStage[PageStage.initial = 0] = 'initial'
  PageStage[PageStage.loading = 1] = 'loading'
  PageStage[PageStage.interactive = 2] = 'interactive'
  PageStage[PageStage.complete = 3] = 'complete'
})(PageStage || (PageStage = {}))

class PageObserver {
  constructor (delegate) {
    this.stage = PageStage.initial
    this.started = false
    this.interpretReadyState = () => {
      const { readyState } = this
      if (readyState == 'interactive') {
        this.pageIsInteractive()
      } else if (readyState == 'complete') {
        this.pageIsComplete()
      }
    }
    this.pageWillUnload = () => {
      this.delegate.pageWillUnload()
    }
    this.delegate = delegate
  }

  start () {
    if (!this.started) {
      if (this.stage == PageStage.initial) {
        this.stage = PageStage.loading
      }
      document.addEventListener('readystatechange', this.interpretReadyState, false)
      addEventListener('pagehide', this.pageWillUnload, false)
      this.started = true
    }
  }

  stop () {
    if (this.started) {
      document.removeEventListener('readystatechange', this.interpretReadyState, false)
      removeEventListener('pagehide', this.pageWillUnload, false)
      this.started = false
    }
  }

  pageIsInteractive () {
    if (this.stage == PageStage.loading) {
      this.stage = PageStage.interactive
      this.delegate.pageBecameInteractive()
    }
  }

  pageIsComplete () {
    this.pageIsInteractive()
    if (this.stage == PageStage.interactive) {
      this.stage = PageStage.complete
      this.delegate.pageLoaded()
    }
  }

  get readyState () {
    return document.readyState
  }
}

class ScrollObserver {
  constructor (delegate) {
    this.started = false
    this.onScroll = () => {
      this.updatePosition({
        x: window.pageXOffset,
        y: window.pageYOffset
      })
    }
    this.delegate = delegate
  }

  start () {
    if (!this.started) {
      addEventListener('scroll', this.onScroll, false)
      this.onScroll()
      this.started = true
    }
  }

  stop () {
    if (this.started) {
      removeEventListener('scroll', this.onScroll, false)
      this.started = false
    }
  }

  updatePosition (position) {
    this.delegate.scrollPositionChanged(position)
  }
}

class StreamMessageRenderer {
  render ({ fragment }) {
    Bardo.preservingPermanentElements(this, getPermanentElementMapForFragment(fragment), () => document.documentElement.appendChild(fragment))
  }

  enteringBardo (currentPermanentElement, newPermanentElement) {
    newPermanentElement.replaceWith(currentPermanentElement.cloneNode(true))
  }

  leavingBardo () {}
}

function getPermanentElementMapForFragment (fragment) {
  const permanentElementsInDocument = queryPermanentElementsAll(document.documentElement)
  const permanentElementMap = {}
  for (const permanentElementInDocument of permanentElementsInDocument) {
    const { id } = permanentElementInDocument
    for (const streamElement of fragment.querySelectorAll('turbo-stream')) {
      const elementInStream = getPermanentElementById(streamElement.templateElement.content, id)
      if (elementInStream) {
        permanentElementMap[id] = [permanentElementInDocument, elementInStream]
      }
    }
  }
  return permanentElementMap
}

class StreamObserver {
  constructor (delegate) {
    this.sources = new Set()
    this.started = false
    this.inspectFetchResponse = event => {
      const response = fetchResponseFromEvent(event)
      if (response && fetchResponseIsStream(response)) {
        event.preventDefault()
        this.receiveMessageResponse(response)
      }
    }
    this.receiveMessageEvent = event => {
      if (this.started && typeof event.data === 'string') {
        this.receiveMessageHTML(event.data)
      }
    }
    this.delegate = delegate
  }

  start () {
    if (!this.started) {
      this.started = true
      addEventListener('turbo:before-fetch-response', this.inspectFetchResponse, false)
    }
  }

  stop () {
    if (this.started) {
      this.started = false
      removeEventListener('turbo:before-fetch-response', this.inspectFetchResponse, false)
    }
  }

  connectStreamSource (source) {
    if (!this.streamSourceIsConnected(source)) {
      this.sources.add(source)
      source.addEventListener('message', this.receiveMessageEvent, false)
    }
  }

  disconnectStreamSource (source) {
    if (this.streamSourceIsConnected(source)) {
      this.sources.delete(source)
      source.removeEventListener('message', this.receiveMessageEvent, false)
    }
  }

  streamSourceIsConnected (source) {
    return this.sources.has(source)
  }

  async receiveMessageResponse (response) {
    const html = await response.responseHTML
    if (html) {
      this.receiveMessageHTML(html)
    }
  }

  receiveMessageHTML (html) {
    this.delegate.receivedMessageFromStream(StreamMessage.wrap(html))
  }
}

function fetchResponseFromEvent (event) {
  let _a
  const fetchResponse = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.fetchResponse
  if (fetchResponse instanceof FetchResponse) {
    return fetchResponse
  }
}

function fetchResponseIsStream (response) {
  let _a
  const contentType = (_a = response.contentType) !== null && _a !== void 0 ? _a : ''
  return contentType.startsWith(StreamMessage.contentType)
}

class ErrorRenderer extends Renderer {
  static renderElement (currentElement, newElement) {
    const { documentElement, body } = document
    documentElement.replaceChild(newElement, body)
  }

  async render () {
    this.replaceHeadAndBody()
    this.activateScriptElements()
  }

  replaceHeadAndBody () {
    const { documentElement, head } = document
    documentElement.replaceChild(this.newHead, head)
    this.renderElement(this.currentElement, this.newElement)
  }

  activateScriptElements () {
    for (const replaceableElement of this.scriptElements) {
      const parentNode = replaceableElement.parentNode
      if (parentNode) {
        const element = activateScriptElement(replaceableElement)
        parentNode.replaceChild(element, replaceableElement)
      }
    }
  }

  get newHead () {
    return this.newSnapshot.headSnapshot.element
  }

  get scriptElements () {
    return document.documentElement.querySelectorAll('script')
  }
}

class PageRenderer extends Renderer {
  static renderElement (currentElement, newElement) {
    if (document.body && newElement instanceof HTMLBodyElement) {
      document.body.replaceWith(newElement)
    } else {
      document.documentElement.appendChild(newElement)
    }
  }

  get shouldRender () {
    return this.newSnapshot.isVisitable && this.trackedElementsAreIdentical
  }

  get reloadReason () {
    if (!this.newSnapshot.isVisitable) {
      return {
        reason: 'turbo_visit_control_is_reload'
      }
    }
    if (!this.trackedElementsAreIdentical) {
      return {
        reason: 'tracked_element_mismatch'
      }
    }
  }

  async prepareToRender () {
    await this.mergeHead()
  }

  async render () {
    if (this.willRender) {
      this.replaceBody()
    }
  }

  finishRendering () {
    super.finishRendering()
    if (!this.isPreview) {
      this.focusFirstAutofocusableElement()
    }
  }

  get currentHeadSnapshot () {
    return this.currentSnapshot.headSnapshot
  }

  get newHeadSnapshot () {
    return this.newSnapshot.headSnapshot
  }

  get newElement () {
    return this.newSnapshot.element
  }

  async mergeHead () {
    const newStylesheetElements = this.copyNewHeadStylesheetElements()
    this.copyNewHeadScriptElements()
    this.removeCurrentHeadProvisionalElements()
    this.copyNewHeadProvisionalElements()
    await newStylesheetElements
  }

  replaceBody () {
    this.preservingPermanentElements(() => {
      this.activateNewBody()
      this.assignNewBody()
    })
  }

  get trackedElementsAreIdentical () {
    return this.currentHeadSnapshot.trackedElementSignature == this.newHeadSnapshot.trackedElementSignature
  }

  async copyNewHeadStylesheetElements () {
    const loadingElements = []
    for (const element of this.newHeadStylesheetElements) {
      loadingElements.push(waitForLoad(element))
      document.head.appendChild(element)
    }
    await Promise.all(loadingElements)
  }

  copyNewHeadScriptElements () {
    for (const element of this.newHeadScriptElements) {
      document.head.appendChild(activateScriptElement(element))
    }
  }

  removeCurrentHeadProvisionalElements () {
    for (const element of this.currentHeadProvisionalElements) {
      document.head.removeChild(element)
    }
  }

  copyNewHeadProvisionalElements () {
    for (const element of this.newHeadProvisionalElements) {
      document.head.appendChild(element)
    }
  }

  activateNewBody () {
    document.adoptNode(this.newElement)
    this.activateNewBodyScriptElements()
  }

  activateNewBodyScriptElements () {
    for (const inertScriptElement of this.newBodyScriptElements) {
      const activatedScriptElement = activateScriptElement(inertScriptElement)
      inertScriptElement.replaceWith(activatedScriptElement)
    }
  }

  assignNewBody () {
    this.renderElement(this.currentElement, this.newElement)
  }

  get newHeadStylesheetElements () {
    return this.newHeadSnapshot.getStylesheetElementsNotInSnapshot(this.currentHeadSnapshot)
  }

  get newHeadScriptElements () {
    return this.newHeadSnapshot.getScriptElementsNotInSnapshot(this.currentHeadSnapshot)
  }

  get currentHeadProvisionalElements () {
    return this.currentHeadSnapshot.provisionalElements
  }

  get newHeadProvisionalElements () {
    return this.newHeadSnapshot.provisionalElements
  }

  get newBodyScriptElements () {
    return this.newElement.querySelectorAll('script')
  }
}

class SnapshotCache {
  constructor (size) {
    this.keys = []
    this.snapshots = {}
    this.size = size
  }

  has (location) {
    return toCacheKey(location) in this.snapshots
  }

  get (location) {
    if (this.has(location)) {
      const snapshot = this.read(location)
      this.touch(location)
      return snapshot
    }
  }

  put (location, snapshot) {
    this.write(location, snapshot)
    this.touch(location)
    return snapshot
  }

  clear () {
    this.snapshots = {}
  }

  read (location) {
    return this.snapshots[toCacheKey(location)]
  }

  write (location, snapshot) {
    this.snapshots[toCacheKey(location)] = snapshot
  }

  touch (location) {
    const key = toCacheKey(location)
    const index = this.keys.indexOf(key)
    if (index > -1) this.keys.splice(index, 1)
    this.keys.unshift(key)
    this.trim()
  }

  trim () {
    for (const key of this.keys.splice(this.size)) {
      delete this.snapshots[key]
    }
  }
}

class PageView extends View {
  constructor () {
    super(...arguments)
    this.snapshotCache = new SnapshotCache(10)
    this.lastRenderedLocation = new URL(location.href)
    this.forceReloaded = false
  }

  renderPage (snapshot, isPreview = false, willRender = true, visit) {
    const renderer = new PageRenderer(this.snapshot, snapshot, PageRenderer.renderElement, isPreview, willRender)
    if (!renderer.shouldRender) {
      this.forceReloaded = true
    } else {
      visit === null || visit === void 0 ? void 0 : visit.changeHistory()
    }
    return this.render(renderer)
  }

  renderError (snapshot, visit) {
    visit === null || visit === void 0 ? void 0 : visit.changeHistory()
    const renderer = new ErrorRenderer(this.snapshot, snapshot, ErrorRenderer.renderElement, false)
    return this.render(renderer)
  }

  clearSnapshotCache () {
    this.snapshotCache.clear()
  }

  async cacheSnapshot (snapshot = this.snapshot) {
    if (snapshot.isCacheable) {
      this.delegate.viewWillCacheSnapshot()
      const { lastRenderedLocation: location } = this
      await nextEventLoopTick()
      const cachedSnapshot = snapshot.clone()
      this.snapshotCache.put(location, cachedSnapshot)
      return cachedSnapshot
    }
  }

  getCachedSnapshotForLocation (location) {
    return this.snapshotCache.get(location)
  }

  get snapshot () {
    return PageSnapshot.fromElement(this.element)
  }
}

class Preloader {
  constructor (delegate) {
    this.selector = 'a[data-turbo-preload]'
    this.delegate = delegate
  }

  get snapshotCache () {
    return this.delegate.navigator.view.snapshotCache
  }

  start () {
    if (document.readyState === 'loading') {
      return document.addEventListener('DOMContentLoaded', () => {
        this.preloadOnLoadLinksForView(document.body)
      })
    } else {
      this.preloadOnLoadLinksForView(document.body)
    }
  }

  preloadOnLoadLinksForView (element) {
    for (const link of element.querySelectorAll(this.selector)) {
      this.preloadURL(link)
    }
  }

  async preloadURL (link) {
    const location = new URL(link.href)
    if (this.snapshotCache.has(location)) {
      return
    }
    try {
      const response = await fetch(location.toString(), {
        headers: {
          'VND.PREFETCH': 'true',
          Accept: 'text/html'
        }
      })
      const responseText = await response.text()
      const snapshot = PageSnapshot.fromHTMLString(responseText)
      this.snapshotCache.put(location, snapshot)
    } catch (_) {}
  }
}

class Session {
  constructor () {
    this.navigator = new Navigator(this)
    this.history = new History(this)
    this.preloader = new Preloader(this)
    this.view = new PageView(this, document.documentElement)
    this.adapter = new BrowserAdapter(this)
    this.pageObserver = new PageObserver(this)
    this.cacheObserver = new CacheObserver()
    this.linkClickObserver = new LinkClickObserver(this, window)
    this.formSubmitObserver = new FormSubmitObserver(this, document)
    this.scrollObserver = new ScrollObserver(this)
    this.streamObserver = new StreamObserver(this)
    this.formLinkClickObserver = new FormLinkClickObserver(this, document.documentElement)
    this.frameRedirector = new FrameRedirector(this, document.documentElement)
    this.streamMessageRenderer = new StreamMessageRenderer()
    this.drive = true
    this.enabled = true
    this.progressBarDelay = 500
    this.started = false
    this.formMode = 'on'
  }

  start () {
    if (!this.started) {
      this.pageObserver.start()
      this.cacheObserver.start()
      this.formLinkClickObserver.start()
      this.linkClickObserver.start()
      this.formSubmitObserver.start()
      this.scrollObserver.start()
      this.streamObserver.start()
      this.frameRedirector.start()
      this.history.start()
      this.preloader.start()
      this.started = true
      this.enabled = true
    }
  }

  disable () {
    this.enabled = false
  }

  stop () {
    if (this.started) {
      this.pageObserver.stop()
      this.cacheObserver.stop()
      this.formLinkClickObserver.stop()
      this.linkClickObserver.stop()
      this.formSubmitObserver.stop()
      this.scrollObserver.stop()
      this.streamObserver.stop()
      this.frameRedirector.stop()
      this.history.stop()
      this.started = false
    }
  }

  registerAdapter (adapter) {
    this.adapter = adapter
  }

  visit (location, options = {}) {
    const frameElement = options.frame ? document.getElementById(options.frame) : null
    if (frameElement instanceof FrameElement) {
      frameElement.src = location.toString()
      frameElement.loaded
    } else {
      this.navigator.proposeVisit(expandURL(location), options)
    }
  }

  connectStreamSource (source) {
    this.streamObserver.connectStreamSource(source)
  }

  disconnectStreamSource (source) {
    this.streamObserver.disconnectStreamSource(source)
  }

  renderStreamMessage (message) {
    this.streamMessageRenderer.render(StreamMessage.wrap(message))
  }

  clearCache () {
    this.view.clearSnapshotCache()
  }

  setProgressBarDelay (delay) {
    this.progressBarDelay = delay
  }

  setFormMode (mode) {
    this.formMode = mode
  }

  get location () {
    return this.history.location
  }

  get restorationIdentifier () {
    return this.history.restorationIdentifier
  }

  historyPoppedToLocationWithRestorationIdentifier (location, restorationIdentifier) {
    if (this.enabled) {
      this.navigator.startVisit(location, restorationIdentifier, {
        action: 'restore',
        historyChanged: true
      })
    } else {
      this.adapter.pageInvalidated({
        reason: 'turbo_disabled'
      })
    }
  }

  scrollPositionChanged (position) {
    this.history.updateRestorationData({
      scrollPosition: position
    })
  }

  willSubmitFormLinkToLocation (link, location) {
    return this.elementIsNavigatable(link) && locationIsVisitable(location, this.snapshot.rootLocation)
  }

  submittedFormLinkToLocation () {}
  willFollowLinkToLocation (link, location, event) {
    return this.elementIsNavigatable(link) && locationIsVisitable(location, this.snapshot.rootLocation) && this.applicationAllowsFollowingLinkToLocation(link, location, event)
  }

  followedLinkToLocation (link, location) {
    const action = this.getActionForLink(link)
    const acceptsStreamResponse = link.hasAttribute('data-turbo-stream')
    this.visit(location.href, {
      action,
      acceptsStreamResponse
    })
  }

  allowsVisitingLocationWithAction (location, action) {
    return this.locationWithActionIsSamePage(location, action) || this.applicationAllowsVisitingLocation(location)
  }

  visitProposedToLocation (location, options) {
    extendURLWithDeprecatedProperties(location)
    this.adapter.visitProposedToLocation(location, options)
  }

  visitStarted (visit) {
    if (!visit.acceptsStreamResponse) {
      markAsBusy(document.documentElement)
    }
    extendURLWithDeprecatedProperties(visit.location)
    if (!visit.silent) {
      this.notifyApplicationAfterVisitingLocation(visit.location, visit.action)
    }
  }

  visitCompleted (visit) {
    clearBusyState(document.documentElement)
    this.notifyApplicationAfterPageLoad(visit.getTimingMetrics())
  }

  locationWithActionIsSamePage (location, action) {
    return this.navigator.locationWithActionIsSamePage(location, action)
  }

  visitScrolledToSamePageLocation (oldURL, newURL) {
    this.notifyApplicationAfterVisitingSamePageLocation(oldURL, newURL)
  }

  willSubmitForm (form, submitter) {
    const action = getAction(form, submitter)
    return this.submissionIsNavigatable(form, submitter) && locationIsVisitable(expandURL(action), this.snapshot.rootLocation)
  }

  formSubmitted (form, submitter) {
    this.navigator.submitForm(form, submitter)
  }

  pageBecameInteractive () {
    this.view.lastRenderedLocation = this.location
    this.notifyApplicationAfterPageLoad()
  }

  pageLoaded () {
    this.history.assumeControlOfScrollRestoration()
  }

  pageWillUnload () {
    this.history.relinquishControlOfScrollRestoration()
  }

  receivedMessageFromStream (message) {
    this.renderStreamMessage(message)
  }

  viewWillCacheSnapshot () {
    let _a
    if (!((_a = this.navigator.currentVisit) === null || _a === void 0 ? void 0 : _a.silent)) {
      this.notifyApplicationBeforeCachingSnapshot()
    }
  }

  allowsImmediateRender ({ element }, options) {
    const event = this.notifyApplicationBeforeRender(element, options)
    const { defaultPrevented, detail: { render } } = event
    if (this.view.renderer && render) {
      this.view.renderer.renderElement = render
    }
    return !defaultPrevented
  }

  viewRenderedSnapshot (_snapshot, _isPreview) {
    this.view.lastRenderedLocation = this.history.location
    this.notifyApplicationAfterRender()
  }

  preloadOnLoadLinksForView (element) {
    this.preloader.preloadOnLoadLinksForView(element)
  }

  viewInvalidated (reason) {
    this.adapter.pageInvalidated(reason)
  }

  frameLoaded (frame) {
    this.notifyApplicationAfterFrameLoad(frame)
  }

  frameRendered (fetchResponse, frame) {
    this.notifyApplicationAfterFrameRender(fetchResponse, frame)
  }

  applicationAllowsFollowingLinkToLocation (link, location, ev) {
    const event = this.notifyApplicationAfterClickingLinkToLocation(link, location, ev)
    return !event.defaultPrevented
  }

  applicationAllowsVisitingLocation (location) {
    const event = this.notifyApplicationBeforeVisitingLocation(location)
    return !event.defaultPrevented
  }

  notifyApplicationAfterClickingLinkToLocation (link, location, event) {
    return dispatch$1('turbo:click', {
      target: link,
      detail: {
        url: location.href,
        originalEvent: event
      },
      cancelable: true
    })
  }

  notifyApplicationBeforeVisitingLocation (location) {
    return dispatch$1('turbo:before-visit', {
      detail: {
        url: location.href
      },
      cancelable: true
    })
  }

  notifyApplicationAfterVisitingLocation (location, action) {
    return dispatch$1('turbo:visit', {
      detail: {
        url: location.href,
        action
      }
    })
  }

  notifyApplicationBeforeCachingSnapshot () {
    return dispatch$1('turbo:before-cache')
  }

  notifyApplicationBeforeRender (newBody, options) {
    return dispatch$1('turbo:before-render', {
      detail: Object.assign({
        newBody
      }, options),
      cancelable: true
    })
  }

  notifyApplicationAfterRender () {
    return dispatch$1('turbo:render')
  }

  notifyApplicationAfterPageLoad (timing = {}) {
    return dispatch$1('turbo:load', {
      detail: {
        url: this.location.href,
        timing
      }
    })
  }

  notifyApplicationAfterVisitingSamePageLocation (oldURL, newURL) {
    dispatchEvent(new HashChangeEvent('hashchange', {
      oldURL: oldURL.toString(),
      newURL: newURL.toString()
    }))
  }

  notifyApplicationAfterFrameLoad (frame) {
    return dispatch$1('turbo:frame-load', {
      target: frame
    })
  }

  notifyApplicationAfterFrameRender (fetchResponse, frame) {
    return dispatch$1('turbo:frame-render', {
      detail: {
        fetchResponse
      },
      target: frame,
      cancelable: true
    })
  }

  submissionIsNavigatable (form, submitter) {
    if (this.formMode == 'off') {
      return false
    } else {
      const submitterIsNavigatable = submitter ? this.elementIsNavigatable(submitter) : true
      if (this.formMode == 'optin') {
        return submitterIsNavigatable && form.closest('[data-turbo="true"]') != null
      } else {
        return submitterIsNavigatable && this.elementIsNavigatable(form)
      }
    }
  }

  elementIsNavigatable (element) {
    const container = element.closest('[data-turbo]')
    const withinFrame = element.closest('turbo-frame')
    if (this.drive || withinFrame) {
      if (container) {
        return container.getAttribute('data-turbo') != 'false'
      } else {
        return true
      }
    } else {
      if (container) {
        return container.getAttribute('data-turbo') == 'true'
      } else {
        return false
      }
    }
  }

  getActionForLink (link) {
    const action = link.getAttribute('data-turbo-action')
    return isAction(action) ? action : 'advance'
  }

  get snapshot () {
    return this.view.snapshot
  }
}

function extendURLWithDeprecatedProperties (url) {
  Object.defineProperties(url, deprecatedLocationPropertyDescriptors)
}

const deprecatedLocationPropertyDescriptors = {
  absoluteURL: {
    get () {
      return this.toString()
    }
  }
}

class Cache {
  constructor (session) {
    this.session = session
  }

  clear () {
    this.session.clearCache()
  }

  resetCacheControl () {
    this.setCacheControl('')
  }

  exemptPageFromCache () {
    this.setCacheControl('no-cache')
  }

  exemptPageFromPreview () {
    this.setCacheControl('no-preview')
  }

  setCacheControl (value) {
    setMetaContent('turbo-cache-control', value)
  }
}

const StreamActions = {
  after () {
    this.targetElements.forEach(e => {
      let _a
      return (_a = e.parentElement) === null || _a === void 0 ? void 0 : _a.insertBefore(this.templateContent, e.nextSibling)
    })
  },
  append () {
    this.removeDuplicateTargetChildren()
    this.targetElements.forEach(e => e.append(this.templateContent))
  },
  before () {
    this.targetElements.forEach(e => {
      let _a
      return (_a = e.parentElement) === null || _a === void 0 ? void 0 : _a.insertBefore(this.templateContent, e)
    })
  },
  prepend () {
    this.removeDuplicateTargetChildren()
    this.targetElements.forEach(e => e.prepend(this.templateContent))
  },
  remove () {
    this.targetElements.forEach(e => e.remove())
  },
  replace () {
    this.targetElements.forEach(e => e.replaceWith(this.templateContent))
  },
  update () {
    this.targetElements.forEach(e => e.replaceChildren(this.templateContent))
  }
}

const session = new Session()

const cache = new Cache(session)

const { navigator: navigator$1 } = session

function start$1 () {
  session.start()
}

function registerAdapter (adapter) {
  session.registerAdapter(adapter)
}

function visit (location, options) {
  session.visit(location, options)
}

function connectStreamSource (source) {
  session.connectStreamSource(source)
}

function disconnectStreamSource (source) {
  session.disconnectStreamSource(source)
}

function renderStreamMessage (message) {
  session.renderStreamMessage(message)
}

function clearCache () {
  console.warn('Please replace `Turbo.clearCache()` with `Turbo.cache.clear()`. The top-level function is deprecated and will be removed in a future version of Turbo.`')
  session.clearCache()
}

function setProgressBarDelay (delay) {
  session.setProgressBarDelay(delay)
}

function setConfirmMethod (confirmMethod) {
  FormSubmission.confirmMethod = confirmMethod
}

function setFormMode (mode) {
  session.setFormMode(mode)
}

const Turbo = Object.freeze({
  __proto__: null,
  navigator: navigator$1,
  session,
  cache,
  PageRenderer,
  PageSnapshot,
  FrameRenderer,
  start: start$1,
  registerAdapter,
  visit,
  connectStreamSource,
  disconnectStreamSource,
  renderStreamMessage,
  clearCache,
  setProgressBarDelay,
  setConfirmMethod,
  setFormMode,
  StreamActions
})

class FrameController {
  constructor (element) {
    this.fetchResponseLoaded = _fetchResponse => {}
    this.currentFetchRequest = null
    this.resolveVisitPromise = () => {}
    this.connected = false
    this.hasBeenLoaded = false
    this.ignoredAttributes = new Set()
    this.action = null
    this.visitCachedSnapshot = ({ element }) => {
      const frame = element.querySelector('#' + this.element.id)
      if (frame && this.previousFrameElement) {
        frame.replaceChildren(...this.previousFrameElement.children)
      }
      delete this.previousFrameElement
    }
    this.element = element
    this.view = new FrameView(this, this.element)
    this.appearanceObserver = new AppearanceObserver(this, this.element)
    this.formLinkClickObserver = new FormLinkClickObserver(this, this.element)
    this.linkInterceptor = new LinkInterceptor(this, this.element)
    this.restorationIdentifier = uuid()
    this.formSubmitObserver = new FormSubmitObserver(this, this.element)
  }

  connect () {
    if (!this.connected) {
      this.connected = true
      if (this.loadingStyle == FrameLoadingStyle.lazy) {
        this.appearanceObserver.start()
      } else {
        this.loadSourceURL()
      }
      this.formLinkClickObserver.start()
      this.linkInterceptor.start()
      this.formSubmitObserver.start()
    }
  }

  disconnect () {
    if (this.connected) {
      this.connected = false
      this.appearanceObserver.stop()
      this.formLinkClickObserver.stop()
      this.linkInterceptor.stop()
      this.formSubmitObserver.stop()
    }
  }

  disabledChanged () {
    if (this.loadingStyle == FrameLoadingStyle.eager) {
      this.loadSourceURL()
    }
  }

  sourceURLChanged () {
    if (this.isIgnoringChangesTo('src')) return
    if (this.element.isConnected) {
      this.complete = false
    }
    if (this.loadingStyle == FrameLoadingStyle.eager || this.hasBeenLoaded) {
      this.loadSourceURL()
    }
  }

  sourceURLReloaded () {
    const { src } = this.element
    this.ignoringChangesToAttribute('complete', () => {
      this.element.removeAttribute('complete')
    })
    this.element.src = null
    this.element.src = src
    return this.element.loaded
  }

  completeChanged () {
    if (this.isIgnoringChangesTo('complete')) return
    this.loadSourceURL()
  }

  loadingStyleChanged () {
    if (this.loadingStyle == FrameLoadingStyle.lazy) {
      this.appearanceObserver.start()
    } else {
      this.appearanceObserver.stop()
      this.loadSourceURL()
    }
  }

  async loadSourceURL () {
    if (this.enabled && this.isActive && !this.complete && this.sourceURL) {
      this.element.loaded = this.visit(expandURL(this.sourceURL))
      this.appearanceObserver.stop()
      await this.element.loaded
      this.hasBeenLoaded = true
    }
  }

  async loadResponse (fetchResponse) {
    if (fetchResponse.redirected || fetchResponse.succeeded && fetchResponse.isHTML) {
      this.sourceURL = fetchResponse.response.url
    }
    try {
      const html = await fetchResponse.responseHTML
      if (html) {
        const { body } = parseHTMLDocument(html)
        const newFrameElement = await this.extractForeignFrameElement(body)
        if (newFrameElement) {
          const snapshot = new Snapshot(newFrameElement)
          const renderer = new FrameRenderer(this, this.view.snapshot, snapshot, FrameRenderer.renderElement, false, false)
          if (this.view.renderPromise) await this.view.renderPromise
          this.changeHistory()
          await this.view.render(renderer)
          this.complete = true
          session.frameRendered(fetchResponse, this.element)
          session.frameLoaded(this.element)
          this.fetchResponseLoaded(fetchResponse)
        } else if (this.willHandleFrameMissingFromResponse(fetchResponse)) {
          console.warn(`A matching frame for #${this.element.id} was missing from the response, transforming into full-page Visit.`)
          this.visitResponse(fetchResponse.response)
        }
      }
    } catch (error) {
      console.error(error)
      this.view.invalidate()
    } finally {
      this.fetchResponseLoaded = () => {}
    }
  }

  elementAppearedInViewport (_element) {
    this.loadSourceURL()
  }

  willSubmitFormLinkToLocation (link) {
    return this.shouldInterceptNavigation(link)
  }

  submittedFormLinkToLocation (link, _location, form) {
    const frame = this.findFrameElement(link)
    if (frame) form.setAttribute('data-turbo-frame', frame.id)
  }

  shouldInterceptLinkClick (element, _location, _event) {
    return this.shouldInterceptNavigation(element)
  }

  linkClickIntercepted (element, location) {
    this.navigateFrame(element, location)
  }

  willSubmitForm (element, submitter) {
    return element.closest('turbo-frame') == this.element && this.shouldInterceptNavigation(element, submitter)
  }

  formSubmitted (element, submitter) {
    if (this.formSubmission) {
      this.formSubmission.stop()
    }
    this.formSubmission = new FormSubmission(this, element, submitter)
    const { fetchRequest } = this.formSubmission
    this.prepareHeadersForRequest(fetchRequest.headers, fetchRequest)
    this.formSubmission.start()
  }

  prepareHeadersForRequest (headers, request) {
    let _a
    headers['Turbo-Frame'] = this.id
    if ((_a = this.currentNavigationElement) === null || _a === void 0 ? void 0 : _a.hasAttribute('data-turbo-stream')) {
      request.acceptResponseType(StreamMessage.contentType)
    }
  }

  requestStarted (_request) {
    markAsBusy(this.element)
  }

  requestPreventedHandlingResponse (_request, _response) {
    this.resolveVisitPromise()
  }

  async requestSucceededWithResponse (request, response) {
    await this.loadResponse(response)
    this.resolveVisitPromise()
  }

  async requestFailedWithResponse (request, response) {
    console.error(response)
    await this.loadResponse(response)
    this.resolveVisitPromise()
  }

  requestErrored (request, error) {
    console.error(error)
    this.resolveVisitPromise()
  }

  requestFinished (_request) {
    clearBusyState(this.element)
  }

  formSubmissionStarted ({ formElement }) {
    markAsBusy(formElement, this.findFrameElement(formElement))
  }

  formSubmissionSucceededWithResponse (formSubmission, response) {
    const frame = this.findFrameElement(formSubmission.formElement, formSubmission.submitter)
    frame.delegate.proposeVisitIfNavigatedWithAction(frame, formSubmission.formElement, formSubmission.submitter)
    frame.delegate.loadResponse(response)
  }

  formSubmissionFailedWithResponse (formSubmission, fetchResponse) {
    this.element.delegate.loadResponse(fetchResponse)
  }

  formSubmissionErrored (formSubmission, error) {
    console.error(error)
  }

  formSubmissionFinished ({ formElement }) {
    clearBusyState(formElement, this.findFrameElement(formElement))
  }

  allowsImmediateRender ({ element: newFrame }, options) {
    const event = dispatch$1('turbo:before-frame-render', {
      target: this.element,
      detail: Object.assign({
        newFrame
      }, options),
      cancelable: true
    })
    const { defaultPrevented, detail: { render } } = event
    if (this.view.renderer && render) {
      this.view.renderer.renderElement = render
    }
    return !defaultPrevented
  }

  viewRenderedSnapshot (_snapshot, _isPreview) {}
  preloadOnLoadLinksForView (element) {
    session.preloadOnLoadLinksForView(element)
  }

  viewInvalidated () {}
  willRenderFrame (currentElement, _newElement) {
    this.previousFrameElement = currentElement.cloneNode(true)
  }

  async visit (url) {
    let _a
    const request = new FetchRequest(this, FetchMethod.get, url, new URLSearchParams(), this.element);
    (_a = this.currentFetchRequest) === null || _a === void 0 ? void 0 : _a.cancel()
    this.currentFetchRequest = request
    return new Promise(resolve => {
      this.resolveVisitPromise = () => {
        this.resolveVisitPromise = () => {}
        this.currentFetchRequest = null
        resolve()
      }
      request.perform()
    })
  }

  navigateFrame (element, url, submitter) {
    const frame = this.findFrameElement(element, submitter)
    this.pageSnapshot = PageSnapshot.fromElement(frame).clone()
    frame.delegate.proposeVisitIfNavigatedWithAction(frame, element, submitter)
    this.withCurrentNavigationElement(element, () => {
      frame.src = url
    })
  }

  proposeVisitIfNavigatedWithAction (frame, element, submitter) {
    this.action = getVisitAction(submitter, element, frame)
    if (isAction(this.action)) {
      const { visitCachedSnapshot } = frame.delegate
      frame.delegate.fetchResponseLoaded = fetchResponse => {
        if (frame.src) {
          const { statusCode, redirected } = fetchResponse
          const responseHTML = frame.ownerDocument.documentElement.outerHTML
          const response = {
            statusCode,
            redirected,
            responseHTML
          }
          const options = {
            response,
            visitCachedSnapshot,
            willRender: false,
            updateHistory: false,
            restorationIdentifier: this.restorationIdentifier,
            snapshot: this.pageSnapshot
          }
          if (this.action) options.action = this.action
          session.visit(frame.src, options)
        }
      }
    }
  }

  changeHistory () {
    if (this.action) {
      const method = getHistoryMethodForAction(this.action)
      session.history.update(method, expandURL(this.element.src || ''), this.restorationIdentifier)
    }
  }

  willHandleFrameMissingFromResponse (fetchResponse) {
    this.element.setAttribute('complete', '')
    const response = fetchResponse.response
    const visit = async (url, options = {}) => {
      if (url instanceof Response) {
        this.visitResponse(url)
      } else {
        session.visit(url, options)
      }
    }
    const event = dispatch$1('turbo:frame-missing', {
      target: this.element,
      detail: {
        response,
        visit
      },
      cancelable: true
    })
    return !event.defaultPrevented
  }

  async visitResponse (response) {
    const wrapped = new FetchResponse(response)
    const responseHTML = await wrapped.responseHTML
    const { location, redirected, statusCode } = wrapped
    return session.visit(location, {
      response: {
        redirected,
        statusCode,
        responseHTML
      }
    })
  }

  findFrameElement (element, submitter) {
    let _a
    const id = getAttribute('data-turbo-frame', submitter, element) || this.element.getAttribute('target')
    return (_a = getFrameElementById(id)) !== null && _a !== void 0 ? _a : this.element
  }

  async extractForeignFrameElement (container) {
    let element
    const id = CSS.escape(this.id)
    try {
      element = activateElement(container.querySelector(`turbo-frame#${id}`), this.sourceURL)
      if (element) {
        return element
      }
      element = activateElement(container.querySelector(`turbo-frame[src][recurse~=${id}]`), this.sourceURL)
      if (element) {
        await element.loaded
        return await this.extractForeignFrameElement(element)
      }
    } catch (error) {
      console.error(error)
      return new FrameElement()
    }
    return null
  }

  formActionIsVisitable (form, submitter) {
    const action = getAction(form, submitter)
    return locationIsVisitable(expandURL(action), this.rootLocation)
  }

  shouldInterceptNavigation (element, submitter) {
    const id = getAttribute('data-turbo-frame', submitter, element) || this.element.getAttribute('target')
    if (element instanceof HTMLFormElement && !this.formActionIsVisitable(element, submitter)) {
      return false
    }
    if (!this.enabled || id == '_top') {
      return false
    }
    if (id) {
      const frameElement = getFrameElementById(id)
      if (frameElement) {
        return !frameElement.disabled
      }
    }
    if (!session.elementIsNavigatable(element)) {
      return false
    }
    if (submitter && !session.elementIsNavigatable(submitter)) {
      return false
    }
    return true
  }

  get id () {
    return this.element.id
  }

  get enabled () {
    return !this.element.disabled
  }

  get sourceURL () {
    if (this.element.src) {
      return this.element.src
    }
  }

  set sourceURL (sourceURL) {
    this.ignoringChangesToAttribute('src', () => {
      this.element.src = sourceURL !== null && sourceURL !== void 0 ? sourceURL : null
    })
  }

  get loadingStyle () {
    return this.element.loading
  }

  get isLoading () {
    return this.formSubmission !== undefined || this.resolveVisitPromise() !== undefined
  }

  get complete () {
    return this.element.hasAttribute('complete')
  }

  set complete (value) {
    this.ignoringChangesToAttribute('complete', () => {
      if (value) {
        this.element.setAttribute('complete', '')
      } else {
        this.element.removeAttribute('complete')
      }
    })
  }

  get isActive () {
    return this.element.isActive && this.connected
  }

  get rootLocation () {
    let _a
    const meta = this.element.ownerDocument.querySelector('meta[name="turbo-root"]')
    const root = (_a = meta === null || meta === void 0 ? void 0 : meta.content) !== null && _a !== void 0 ? _a : '/'
    return expandURL(root)
  }

  isIgnoringChangesTo (attributeName) {
    return this.ignoredAttributes.has(attributeName)
  }

  ignoringChangesToAttribute (attributeName, callback) {
    this.ignoredAttributes.add(attributeName)
    callback()
    this.ignoredAttributes.delete(attributeName)
  }

  withCurrentNavigationElement (element, callback) {
    this.currentNavigationElement = element
    callback()
    delete this.currentNavigationElement
  }
}

function getFrameElementById (id) {
  if (id != null) {
    const element = document.getElementById(id)
    if (element instanceof FrameElement) {
      return element
    }
  }
}

function activateElement (element, currentURL) {
  if (element) {
    const src = element.getAttribute('src')
    if (src != null && currentURL != null && urlsAreEqual(src, currentURL)) {
      throw new Error(`Matching <turbo-frame id="${element.id}"> element has a source URL which references itself`)
    }
    if (element.ownerDocument !== document) {
      element = document.importNode(element, true)
    }
    if (element instanceof FrameElement) {
      element.connectedCallback()
      element.disconnectedCallback()
      return element
    }
  }
}

class StreamElement extends HTMLElement {
  static async renderElement (newElement) {
    await newElement.performAction()
  }

  async connectedCallback () {
    try {
      await this.render()
    } catch (error) {
      console.error(error)
    } finally {
      this.disconnect()
    }
  }

  async render () {
    let _a
    return (_a = this.renderPromise) !== null && _a !== void 0
      ? _a
      : this.renderPromise = (async () => {
        const event = this.beforeRenderEvent
        if (this.dispatchEvent(event)) {
          await nextAnimationFrame()
          await event.detail.render(this)
        }
      })()
  }

  disconnect () {
    try {
      this.remove()
    } catch (_a) {}
  }

  removeDuplicateTargetChildren () {
    this.duplicateChildren.forEach(c => c.remove())
  }

  get duplicateChildren () {
    let _a
    const existingChildren = this.targetElements.flatMap(e => [...e.children]).filter(c => !!c.id)
    const newChildrenIds = [...((_a = this.templateContent) === null || _a === void 0 ? void 0 : _a.children) || []].filter(c => !!c.id).map(c => c.id)
    return existingChildren.filter(c => newChildrenIds.includes(c.id))
  }

  get performAction () {
    if (this.action) {
      const actionFunction = StreamActions[this.action]
      if (actionFunction) {
        return actionFunction
      }
      this.raise('unknown action')
    }
    this.raise('action attribute is missing')
  }

  get targetElements () {
    if (this.target) {
      return this.targetElementsById
    } else if (this.targets) {
      return this.targetElementsByQuery
    } else {
      this.raise('target or targets attribute is missing')
    }
  }

  get templateContent () {
    return this.templateElement.content.cloneNode(true)
  }

  get templateElement () {
    if (this.firstElementChild === null) {
      const template = this.ownerDocument.createElement('template')
      this.appendChild(template)
      return template
    } else if (this.firstElementChild instanceof HTMLTemplateElement) {
      return this.firstElementChild
    }
    this.raise('first child element must be a <template> element')
  }

  get action () {
    return this.getAttribute('action')
  }

  get target () {
    return this.getAttribute('target')
  }

  get targets () {
    return this.getAttribute('targets')
  }

  raise (message) {
    throw new Error(`${this.description}: ${message}`)
  }

  get description () {
    let _a, _b
    return (_b = ((_a = this.outerHTML.match(/<[^>]+>/)) !== null && _a !== void 0 ? _a : [])[0]) !== null && _b !== void 0 ? _b : '<turbo-stream>'
  }

  get beforeRenderEvent () {
    return new CustomEvent('turbo:before-stream-render', {
      bubbles: true,
      cancelable: true,
      detail: {
        newStream: this,
        render: StreamElement.renderElement
      }
    })
  }

  get targetElementsById () {
    let _a
    const element = (_a = this.ownerDocument) === null || _a === void 0 ? void 0 : _a.getElementById(this.target)
    if (element !== null) {
      return [element]
    } else {
      return []
    }
  }

  get targetElementsByQuery () {
    let _a
    const elements = (_a = this.ownerDocument) === null || _a === void 0 ? void 0 : _a.querySelectorAll(this.targets)
    if (elements.length !== 0) {
      return Array.prototype.slice.call(elements)
    } else {
      return []
    }
  }
}

class StreamSourceElement extends HTMLElement {
  constructor () {
    super(...arguments)
    this.streamSource = null
  }

  connectedCallback () {
    this.streamSource = this.src.match(/^ws{1,2}:/) ? new WebSocket(this.src) : new EventSource(this.src)
    connectStreamSource(this.streamSource)
  }

  disconnectedCallback () {
    if (this.streamSource) {
      disconnectStreamSource(this.streamSource)
    }
  }

  get src () {
    return this.getAttribute('src') || ''
  }
}

FrameElement.delegateConstructor = FrameController

if (customElements.get('turbo-frame') === undefined) {
  customElements.define('turbo-frame', FrameElement)
}

if (customElements.get('turbo-stream') === undefined) {
  customElements.define('turbo-stream', StreamElement)
}

if (customElements.get('turbo-stream-source') === undefined) {
  customElements.define('turbo-stream-source', StreamSourceElement)
}

(() => {
  let element = document.currentScript
  if (!element) return
  if (element.hasAttribute('data-turbo-suppress-warning')) return
  element = element.parentElement
  while (element) {
    if (element == document.body) {
      return console.warn(unindent`
        You are loading Turbo from a <script> element inside the <body> element. This is probably not what you meant to do!

        Load your application’s JavaScript bundle inside the <head> element instead. <script> elements in <body> are evaluated with each page change.

        For more information, see: https://turbo.hotwired.dev/handbook/building#working-with-script-elements

        ——
        Suppress this warning by adding a "data-turbo-suppress-warning" attribute to: %s
      `, element.outerHTML)
    }
    element = element.parentElement
  }
})()

window.Turbo = Turbo

start$1()

let consumer

async function getConsumer () {
  return consumer || setConsumer(createConsumer$1().then(setConsumer))
}

function setConsumer (newConsumer) {
  return consumer = newConsumer
}

async function createConsumer$1 () {
  const { createConsumer } = await Promise.resolve().then(function () {
    return index
  })
  return createConsumer()
}

async function subscribeTo (channel, mixin) {
  const { subscriptions } = await getConsumer()
  return subscriptions.create(channel, mixin)
}

function walk (obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (obj instanceof Date || obj instanceof RegExp) return obj
  if (Array.isArray(obj)) return obj.map(walk)
  return Object.keys(obj).reduce(function (acc, key) {
    const camel = key[0].toLowerCase() + key.slice(1).replace(/([A-Z]+)/g, function (m, x) {
      return '_' + x.toLowerCase()
    })
    acc[camel] = walk(obj[key])
    return acc
  }, {})
}

class TurboCableStreamSourceElement extends HTMLElement {
  async connectedCallback () {
    connectStreamSource(this)
    this.subscription = await subscribeTo(this.channel, {
      received: this.dispatchMessageEvent.bind(this)
    })
  }

  disconnectedCallback () {
    disconnectStreamSource(this)
    if (this.subscription) this.subscription.unsubscribe()
  }

  dispatchMessageEvent (data) {
    const event = new MessageEvent('message', {
      data
    })
    return this.dispatchEvent(event)
  }

  get channel () {
    const channel = this.getAttribute('channel')
    const signed_stream_name = this.getAttribute('signed-stream-name')
    return {
      channel,
      signed_stream_name,
      ...walk({
        ...this.dataset
      })
    }
  }
}

customElements.define('turbo-cable-stream-source', TurboCableStreamSourceElement)

function encodeMethodIntoRequestBody (event) {
  if (event.target instanceof HTMLFormElement) {
    const { target: form, detail: { fetchOptions } } = event
    form.addEventListener('turbo:submit-start', ({ detail: { formSubmission: { submitter } } }) => {
      const method = submitter && submitter.formMethod || fetchOptions.body && fetchOptions.body.get('_method') || form.getAttribute('method')
      if (!/get/i.test(method)) {
        if (/post/i.test(method)) {
          fetchOptions.body.delete('_method')
        } else {
          fetchOptions.body.set('_method', method)
        }
        fetchOptions.method = 'post'
      }
    }, {
      once: true
    })
  }
}

addEventListener('turbo:before-fetch-request', encodeMethodIntoRequestBody)

const top = 'top'

const bottom = 'bottom'

const right = 'right'

const left = 'left'

const auto = 'auto'

const basePlacements = [top, bottom, right, left]

const start = 'start'

const end = 'end'

const clippingParents = 'clippingParents'

const viewport = 'viewport'

const popper = 'popper'

const reference = 'reference'

const variationPlacements = basePlacements.reduce(function (acc, placement) {
  return acc.concat([placement + '-' + start, placement + '-' + end])
}, [])

const placements = [].concat(basePlacements, [auto]).reduce(function (acc, placement) {
  return acc.concat([placement, placement + '-' + start, placement + '-' + end])
}, [])

const beforeRead = 'beforeRead'

const read = 'read'

const afterRead = 'afterRead'

const beforeMain = 'beforeMain'

const main = 'main'

const afterMain = 'afterMain'

const beforeWrite = 'beforeWrite'

const write = 'write'

const afterWrite = 'afterWrite'

const modifierPhases = [beforeRead, read, afterRead, beforeMain, main, afterMain, beforeWrite, write, afterWrite]

function getNodeName (element) {
  return element ? (element.nodeName || '').toLowerCase() : null
}

function getWindow (node) {
  if (node == null) {
    return window
  }
  if (node.toString() !== '[object Window]') {
    const ownerDocument = node.ownerDocument
    return ownerDocument ? ownerDocument.defaultView || window : window
  }
  return node
}

function isElement$1 (node) {
  const OwnElement = getWindow(node).Element
  return node instanceof OwnElement || node instanceof Element
}

function isHTMLElement (node) {
  const OwnElement = getWindow(node).HTMLElement
  return node instanceof OwnElement || node instanceof HTMLElement
}

function isShadowRoot (node) {
  if (typeof ShadowRoot === 'undefined') {
    return false
  }
  const OwnElement = getWindow(node).ShadowRoot
  return node instanceof OwnElement || node instanceof ShadowRoot
}

function applyStyles (_ref) {
  const state = _ref.state
  Object.keys(state.elements).forEach(function (name) {
    const style = state.styles[name] || {}
    const attributes = state.attributes[name] || {}
    const element = state.elements[name]
    if (!isHTMLElement(element) || !getNodeName(element)) {
      return
    }
    Object.assign(element.style, style)
    Object.keys(attributes).forEach(function (name) {
      const value = attributes[name]
      if (value === false) {
        element.removeAttribute(name)
      } else {
        element.setAttribute(name, value === true ? '' : value)
      }
    })
  })
}

function effect$2 (_ref2) {
  const state = _ref2.state
  const initialStyles = {
    popper: {
      position: state.options.strategy,
      left: '0',
      top: '0',
      margin: '0'
    },
    arrow: {
      position: 'absolute'
    },
    reference: {}
  }
  Object.assign(state.elements.popper.style, initialStyles.popper)
  state.styles = initialStyles
  if (state.elements.arrow) {
    Object.assign(state.elements.arrow.style, initialStyles.arrow)
  }
  return function () {
    Object.keys(state.elements).forEach(function (name) {
      const element = state.elements[name]
      const attributes = state.attributes[name] || {}
      const styleProperties = Object.keys(state.styles.hasOwnProperty(name) ? state.styles[name] : initialStyles[name])
      const style = styleProperties.reduce(function (style, property) {
        style[property] = ''
        return style
      }, {})
      if (!isHTMLElement(element) || !getNodeName(element)) {
        return
      }
      Object.assign(element.style, style)
      Object.keys(attributes).forEach(function (attribute) {
        element.removeAttribute(attribute)
      })
    })
  }
}

const applyStyles$1 = {
  name: 'applyStyles',
  enabled: true,
  phase: 'write',
  fn: applyStyles,
  effect: effect$2,
  requires: ['computeStyles']
}

function getBasePlacement (placement) {
  return placement.split('-')[0]
}

const max = Math.max

const min = Math.min

const round = Math.round

function getUAString () {
  const uaData = navigator.userAgentData
  if (uaData != null && uaData.brands) {
    return uaData.brands.map(function (item) {
      return item.brand + '/' + item.version
    }).join(' ')
  }
  return navigator.userAgent
}

function isLayoutViewport () {
  return !/^((?!chrome|android).)*safari/i.test(getUAString())
}

function getBoundingClientRect (element, includeScale, isFixedStrategy) {
  if (includeScale === void 0) {
    includeScale = false
  }
  if (isFixedStrategy === void 0) {
    isFixedStrategy = false
  }
  const clientRect = element.getBoundingClientRect()
  let scaleX = 1
  let scaleY = 1
  if (includeScale && isHTMLElement(element)) {
    scaleX = element.offsetWidth > 0 ? round(clientRect.width) / element.offsetWidth || 1 : 1
    scaleY = element.offsetHeight > 0 ? round(clientRect.height) / element.offsetHeight || 1 : 1
  }
  const _ref = isElement$1(element) ? getWindow(element) : window; const visualViewport = _ref.visualViewport
  const addVisualOffsets = !isLayoutViewport() && isFixedStrategy
  const x = (clientRect.left + (addVisualOffsets && visualViewport ? visualViewport.offsetLeft : 0)) / scaleX
  const y = (clientRect.top + (addVisualOffsets && visualViewport ? visualViewport.offsetTop : 0)) / scaleY
  const width = clientRect.width / scaleX
  const height = clientRect.height / scaleY
  return {
    width,
    height,
    top: y,
    right: x + width,
    bottom: y + height,
    left: x,
    x,
    y
  }
}

function getLayoutRect (element) {
  const clientRect = getBoundingClientRect(element)
  let width = element.offsetWidth
  let height = element.offsetHeight
  if (Math.abs(clientRect.width - width) <= 1) {
    width = clientRect.width
  }
  if (Math.abs(clientRect.height - height) <= 1) {
    height = clientRect.height
  }
  return {
    x: element.offsetLeft,
    y: element.offsetTop,
    width,
    height
  }
}

function contains (parent, child) {
  const rootNode = child.getRootNode && child.getRootNode()
  if (parent.contains(child)) {
    return true
  } else if (rootNode && isShadowRoot(rootNode)) {
    let next = child
    do {
      if (next && parent.isSameNode(next)) {
        return true
      }
      next = next.parentNode || next.host
    } while (next)
  }
  return false
}

function getComputedStyle$1 (element) {
  return getWindow(element).getComputedStyle(element)
}

function isTableElement (element) {
  return ['table', 'td', 'th'].indexOf(getNodeName(element)) >= 0
}

function getDocumentElement (element) {
  return ((isElement$1(element) ? element.ownerDocument : element.document) || window.document).documentElement
}

function getParentNode (element) {
  if (getNodeName(element) === 'html') {
    return element
  }
  return element.assignedSlot || element.parentNode || (isShadowRoot(element) ? element.host : null) || getDocumentElement(element)
}

function getTrueOffsetParent (element) {
  if (!isHTMLElement(element) || getComputedStyle$1(element).position === 'fixed') {
    return null
  }
  return element.offsetParent
}

function getContainingBlock (element) {
  const isFirefox = /firefox/i.test(getUAString())
  const isIE = /Trident/i.test(getUAString())
  if (isIE && isHTMLElement(element)) {
    const elementCss = getComputedStyle$1(element)
    if (elementCss.position === 'fixed') {
      return null
    }
  }
  let currentNode = getParentNode(element)
  if (isShadowRoot(currentNode)) {
    currentNode = currentNode.host
  }
  while (isHTMLElement(currentNode) && ['html', 'body'].indexOf(getNodeName(currentNode)) < 0) {
    const css = getComputedStyle$1(currentNode)
    if (css.transform !== 'none' || css.perspective !== 'none' || css.contain === 'paint' || ['transform', 'perspective'].indexOf(css.willChange) !== -1 || isFirefox && css.willChange === 'filter' || isFirefox && css.filter && css.filter !== 'none') {
      return currentNode
    } else {
      currentNode = currentNode.parentNode
    }
  }
  return null
}

function getOffsetParent (element) {
  const window = getWindow(element)
  let offsetParent = getTrueOffsetParent(element)
  while (offsetParent && isTableElement(offsetParent) && getComputedStyle$1(offsetParent).position === 'static') {
    offsetParent = getTrueOffsetParent(offsetParent)
  }
  if (offsetParent && (getNodeName(offsetParent) === 'html' || getNodeName(offsetParent) === 'body' && getComputedStyle$1(offsetParent).position === 'static')) {
    return window
  }
  return offsetParent || getContainingBlock(element) || window
}

function getMainAxisFromPlacement (placement) {
  return ['top', 'bottom'].indexOf(placement) >= 0 ? 'x' : 'y'
}

function within (min$1, value, max$1) {
  return max(min$1, min(value, max$1))
}

function withinMaxClamp (min, value, max) {
  const v = within(min, value, max)
  return v > max ? max : v
}

function getFreshSideObject () {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  }
}

function mergePaddingObject (paddingObject) {
  return Object.assign({}, getFreshSideObject(), paddingObject)
}

function expandToHashMap (value, keys) {
  return keys.reduce(function (hashMap, key) {
    hashMap[key] = value
    return hashMap
  }, {})
}

const toPaddingObject = function toPaddingObject (padding, state) {
  padding = typeof padding === 'function'
    ? padding(Object.assign({}, state.rects, {
      placement: state.placement
    }))
    : padding
  return mergePaddingObject(typeof padding !== 'number' ? padding : expandToHashMap(padding, basePlacements))
}

function arrow (_ref) {
  let _state$modifiersData$
  const state = _ref.state; const name = _ref.name; const options = _ref.options
  const arrowElement = state.elements.arrow
  const popperOffsets = state.modifiersData.popperOffsets
  const basePlacement = getBasePlacement(state.placement)
  const axis = getMainAxisFromPlacement(basePlacement)
  const isVertical = [left, right].indexOf(basePlacement) >= 0
  const len = isVertical ? 'height' : 'width'
  if (!arrowElement || !popperOffsets) {
    return
  }
  const paddingObject = toPaddingObject(options.padding, state)
  const arrowRect = getLayoutRect(arrowElement)
  const minProp = axis === 'y' ? top : left
  const maxProp = axis === 'y' ? bottom : right
  const endDiff = state.rects.reference[len] + state.rects.reference[axis] - popperOffsets[axis] - state.rects.popper[len]
  const startDiff = popperOffsets[axis] - state.rects.reference[axis]
  const arrowOffsetParent = getOffsetParent(arrowElement)
  const clientSize = arrowOffsetParent ? axis === 'y' ? arrowOffsetParent.clientHeight || 0 : arrowOffsetParent.clientWidth || 0 : 0
  const centerToReference = endDiff / 2 - startDiff / 2
  const min = paddingObject[minProp]
  const max = clientSize - arrowRect[len] - paddingObject[maxProp]
  const center = clientSize / 2 - arrowRect[len] / 2 + centerToReference
  const offset = within(min, center, max)
  const axisProp = axis
  state.modifiersData[name] = (_state$modifiersData$ = {}, _state$modifiersData$[axisProp] = offset,
  _state$modifiersData$.centerOffset = offset - center, _state$modifiersData$)
}

function effect$1 (_ref2) {
  const state = _ref2.state; const options = _ref2.options
  const _options$element = options.element; let arrowElement = _options$element === void 0 ? '[data-popper-arrow]' : _options$element
  if (arrowElement == null) {
    return
  }
  if (typeof arrowElement === 'string') {
    arrowElement = state.elements.popper.querySelector(arrowElement)
    if (!arrowElement) {
      return
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    if (!isHTMLElement(arrowElement)) {
      console.error(['Popper: "arrow" element must be an HTMLElement (not an SVGElement).', 'To use an SVG arrow, wrap it in an HTMLElement that will be used as', 'the arrow.'].join(' '))
    }
  }
  if (!contains(state.elements.popper, arrowElement)) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(['Popper: "arrow" modifier\'s `element` must be a child of the popper', 'element.'].join(' '))
    }
    return
  }
  state.elements.arrow = arrowElement
}

const arrow$1 = {
  name: 'arrow',
  enabled: true,
  phase: 'main',
  fn: arrow,
  effect: effect$1,
  requires: ['popperOffsets'],
  requiresIfExists: ['preventOverflow']
}

function getVariation (placement) {
  return placement.split('-')[1]
}

const unsetSides = {
  top: 'auto',
  right: 'auto',
  bottom: 'auto',
  left: 'auto'
}

function roundOffsetsByDPR (_ref) {
  const x = _ref.x; const y = _ref.y
  const win = window
  const dpr = win.devicePixelRatio || 1
  return {
    x: round(x * dpr) / dpr || 0,
    y: round(y * dpr) / dpr || 0
  }
}

function mapToStyles (_ref2) {
  let _Object$assign2
  const popper = _ref2.popper; const popperRect = _ref2.popperRect; const placement = _ref2.placement; const variation = _ref2.variation; const offsets = _ref2.offsets; const position = _ref2.position; const gpuAcceleration = _ref2.gpuAcceleration; const adaptive = _ref2.adaptive; const roundOffsets = _ref2.roundOffsets; const isFixed = _ref2.isFixed
  const _offsets$x = offsets.x; let x = _offsets$x === void 0 ? 0 : _offsets$x; const _offsets$y = offsets.y; let y = _offsets$y === void 0 ? 0 : _offsets$y
  const _ref3 = typeof roundOffsets === 'function'
    ? roundOffsets({
      x,
      y
    })
    : {
        x,
        y
      }
  x = _ref3.x
  y = _ref3.y
  const hasX = offsets.hasOwnProperty('x')
  const hasY = offsets.hasOwnProperty('y')
  let sideX = left
  let sideY = top
  const win = window
  if (adaptive) {
    let offsetParent = getOffsetParent(popper)
    let heightProp = 'clientHeight'
    let widthProp = 'clientWidth'
    if (offsetParent === getWindow(popper)) {
      offsetParent = getDocumentElement(popper)
      if (getComputedStyle$1(offsetParent).position !== 'static' && position === 'absolute') {
        heightProp = 'scrollHeight'
        widthProp = 'scrollWidth'
      }
    }
    offsetParent = offsetParent
    if (placement === top || (placement === left || placement === right) && variation === end) {
      sideY = bottom
      const offsetY = isFixed && offsetParent === win && win.visualViewport ? win.visualViewport.height : offsetParent[heightProp]
      y -= offsetY - popperRect.height
      y *= gpuAcceleration ? 1 : -1
    }
    if (placement === left || (placement === top || placement === bottom) && variation === end) {
      sideX = right
      const offsetX = isFixed && offsetParent === win && win.visualViewport ? win.visualViewport.width : offsetParent[widthProp]
      x -= offsetX - popperRect.width
      x *= gpuAcceleration ? 1 : -1
    }
  }
  const commonStyles = Object.assign({
    position
  }, adaptive && unsetSides)
  const _ref4 = roundOffsets === true
    ? roundOffsetsByDPR({
      x,
      y
    })
    : {
        x,
        y
      }
  x = _ref4.x
  y = _ref4.y
  if (gpuAcceleration) {
    let _Object$assign
    return Object.assign({}, commonStyles, (_Object$assign = {}, _Object$assign[sideY] = hasY ? '0' : '',
    _Object$assign[sideX] = hasX ? '0' : '', _Object$assign.transform = (win.devicePixelRatio || 1) <= 1 ? 'translate(' + x + 'px, ' + y + 'px)' : 'translate3d(' + x + 'px, ' + y + 'px, 0)',
    _Object$assign))
  }
  return Object.assign({}, commonStyles, (_Object$assign2 = {}, _Object$assign2[sideY] = hasY ? y + 'px' : '',
  _Object$assign2[sideX] = hasX ? x + 'px' : '', _Object$assign2.transform = '', _Object$assign2))
}

function computeStyles (_ref5) {
  const state = _ref5.state; const options = _ref5.options
  const _options$gpuAccelerat = options.gpuAcceleration; const gpuAcceleration = _options$gpuAccelerat === void 0 ? true : _options$gpuAccelerat; const _options$adaptive = options.adaptive; const adaptive = _options$adaptive === void 0 ? true : _options$adaptive; const _options$roundOffsets = options.roundOffsets; const roundOffsets = _options$roundOffsets === void 0 ? true : _options$roundOffsets
  if (process.env.NODE_ENV !== 'production') {
    const transitionProperty = getComputedStyle$1(state.elements.popper).transitionProperty || ''
    if (adaptive && ['transform', 'top', 'right', 'bottom', 'left'].some(function (property) {
      return transitionProperty.indexOf(property) >= 0
    })) {
      console.warn(['Popper: Detected CSS transitions on at least one of the following', 'CSS properties: "transform", "top", "right", "bottom", "left".', '\n\n', 'Disable the "computeStyles" modifier\'s `adaptive` option to allow', 'for smooth transitions, or remove these properties from the CSS', 'transition declaration on the popper element if only transitioning', 'opacity or background-color for example.', '\n\n', 'We recommend using the popper element as a wrapper around an inner', 'element that can have any CSS property transitioned for animations.'].join(' '))
    }
  }
  const commonStyles = {
    placement: getBasePlacement(state.placement),
    variation: getVariation(state.placement),
    popper: state.elements.popper,
    popperRect: state.rects.popper,
    gpuAcceleration,
    isFixed: state.options.strategy === 'fixed'
  }
  if (state.modifiersData.popperOffsets != null) {
    state.styles.popper = Object.assign({}, state.styles.popper, mapToStyles(Object.assign({}, commonStyles, {
      offsets: state.modifiersData.popperOffsets,
      position: state.options.strategy,
      adaptive,
      roundOffsets
    })))
  }
  if (state.modifiersData.arrow != null) {
    state.styles.arrow = Object.assign({}, state.styles.arrow, mapToStyles(Object.assign({}, commonStyles, {
      offsets: state.modifiersData.arrow,
      position: 'absolute',
      adaptive: false,
      roundOffsets
    })))
  }
  state.attributes.popper = Object.assign({}, state.attributes.popper, {
    'data-popper-placement': state.placement
  })
}

const computeStyles$1 = {
  name: 'computeStyles',
  enabled: true,
  phase: 'beforeWrite',
  fn: computeStyles,
  data: {}
}

const passive = {
  passive: true
}

function effect (_ref) {
  const state = _ref.state; const instance = _ref.instance; const options = _ref.options
  const _options$scroll = options.scroll; const scroll = _options$scroll === void 0 ? true : _options$scroll; const _options$resize = options.resize; const resize = _options$resize === void 0 ? true : _options$resize
  const window = getWindow(state.elements.popper)
  const scrollParents = [].concat(state.scrollParents.reference, state.scrollParents.popper)
  if (scroll) {
    scrollParents.forEach(function (scrollParent) {
      scrollParent.addEventListener('scroll', instance.update, passive)
    })
  }
  if (resize) {
    window.addEventListener('resize', instance.update, passive)
  }
  return function () {
    if (scroll) {
      scrollParents.forEach(function (scrollParent) {
        scrollParent.removeEventListener('scroll', instance.update, passive)
      })
    }
    if (resize) {
      window.removeEventListener('resize', instance.update, passive)
    }
  }
}

const eventListeners = {
  name: 'eventListeners',
  enabled: true,
  phase: 'write',
  fn: function fn () {},
  effect,
  data: {}
}

const hash$1 = {
  left: 'right',
  right: 'left',
  bottom: 'top',
  top: 'bottom'
}

function getOppositePlacement (placement) {
  return placement.replace(/left|right|bottom|top/g, function (matched) {
    return hash$1[matched]
  })
}

const hash = {
  start: 'end',
  end: 'start'
}

function getOppositeVariationPlacement (placement) {
  return placement.replace(/start|end/g, function (matched) {
    return hash[matched]
  })
}

function getWindowScroll (node) {
  const win = getWindow(node)
  const scrollLeft = win.pageXOffset
  const scrollTop = win.pageYOffset
  return {
    scrollLeft,
    scrollTop
  }
}

function getWindowScrollBarX (element) {
  return getBoundingClientRect(getDocumentElement(element)).left + getWindowScroll(element).scrollLeft
}

function getViewportRect (element, strategy) {
  const win = getWindow(element)
  const html = getDocumentElement(element)
  const visualViewport = win.visualViewport
  let width = html.clientWidth
  let height = html.clientHeight
  let x = 0
  let y = 0
  if (visualViewport) {
    width = visualViewport.width
    height = visualViewport.height
    const layoutViewport = isLayoutViewport()
    if (layoutViewport || !layoutViewport && strategy === 'fixed') {
      x = visualViewport.offsetLeft
      y = visualViewport.offsetTop
    }
  }
  return {
    width,
    height,
    x: x + getWindowScrollBarX(element),
    y
  }
}

function getDocumentRect (element) {
  let _element$ownerDocumen
  const html = getDocumentElement(element)
  const winScroll = getWindowScroll(element)
  const body = (_element$ownerDocumen = element.ownerDocument) == null ? void 0 : _element$ownerDocumen.body
  const width = max(html.scrollWidth, html.clientWidth, body ? body.scrollWidth : 0, body ? body.clientWidth : 0)
  const height = max(html.scrollHeight, html.clientHeight, body ? body.scrollHeight : 0, body ? body.clientHeight : 0)
  let x = -winScroll.scrollLeft + getWindowScrollBarX(element)
  const y = -winScroll.scrollTop
  if (getComputedStyle$1(body || html).direction === 'rtl') {
    x += max(html.clientWidth, body ? body.clientWidth : 0) - width
  }
  return {
    width,
    height,
    x,
    y
  }
}

function isScrollParent (element) {
  const _getComputedStyle = getComputedStyle$1(element); const overflow = _getComputedStyle.overflow; const overflowX = _getComputedStyle.overflowX; const overflowY = _getComputedStyle.overflowY
  return /auto|scroll|overlay|hidden/.test(overflow + overflowY + overflowX)
}

function getScrollParent (node) {
  if (['html', 'body', '#document'].indexOf(getNodeName(node)) >= 0) {
    return node.ownerDocument.body
  }
  if (isHTMLElement(node) && isScrollParent(node)) {
    return node
  }
  return getScrollParent(getParentNode(node))
}

function listScrollParents (element, list) {
  let _element$ownerDocumen
  if (list === void 0) {
    list = []
  }
  const scrollParent = getScrollParent(element)
  const isBody = scrollParent === ((_element$ownerDocumen = element.ownerDocument) == null ? void 0 : _element$ownerDocumen.body)
  const win = getWindow(scrollParent)
  const target = isBody ? [win].concat(win.visualViewport || [], isScrollParent(scrollParent) ? scrollParent : []) : scrollParent
  const updatedList = list.concat(target)
  return isBody ? updatedList : updatedList.concat(listScrollParents(getParentNode(target)))
}

function rectToClientRect (rect) {
  return Object.assign({}, rect, {
    left: rect.x,
    top: rect.y,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height
  })
}

function getInnerBoundingClientRect (element, strategy) {
  const rect = getBoundingClientRect(element, false, strategy === 'fixed')
  rect.top = rect.top + element.clientTop
  rect.left = rect.left + element.clientLeft
  rect.bottom = rect.top + element.clientHeight
  rect.right = rect.left + element.clientWidth
  rect.width = element.clientWidth
  rect.height = element.clientHeight
  rect.x = rect.left
  rect.y = rect.top
  return rect
}

function getClientRectFromMixedType (element, clippingParent, strategy) {
  return clippingParent === viewport ? rectToClientRect(getViewportRect(element, strategy)) : isElement$1(clippingParent) ? getInnerBoundingClientRect(clippingParent, strategy) : rectToClientRect(getDocumentRect(getDocumentElement(element)))
}

function getClippingParents (element) {
  const clippingParents = listScrollParents(getParentNode(element))
  const canEscapeClipping = ['absolute', 'fixed'].indexOf(getComputedStyle$1(element).position) >= 0
  const clipperElement = canEscapeClipping && isHTMLElement(element) ? getOffsetParent(element) : element
  if (!isElement$1(clipperElement)) {
    return []
  }
  return clippingParents.filter(function (clippingParent) {
    return isElement$1(clippingParent) && contains(clippingParent, clipperElement) && getNodeName(clippingParent) !== 'body'
  })
}

function getClippingRect (element, boundary, rootBoundary, strategy) {
  const mainClippingParents = boundary === 'clippingParents' ? getClippingParents(element) : [].concat(boundary)
  const clippingParents = [].concat(mainClippingParents, [rootBoundary])
  const firstClippingParent = clippingParents[0]
  const clippingRect = clippingParents.reduce(function (accRect, clippingParent) {
    const rect = getClientRectFromMixedType(element, clippingParent, strategy)
    accRect.top = max(rect.top, accRect.top)
    accRect.right = min(rect.right, accRect.right)
    accRect.bottom = min(rect.bottom, accRect.bottom)
    accRect.left = max(rect.left, accRect.left)
    return accRect
  }, getClientRectFromMixedType(element, firstClippingParent, strategy))
  clippingRect.width = clippingRect.right - clippingRect.left
  clippingRect.height = clippingRect.bottom - clippingRect.top
  clippingRect.x = clippingRect.left
  clippingRect.y = clippingRect.top
  return clippingRect
}

function computeOffsets (_ref) {
  const reference = _ref.reference; const element = _ref.element; const placement = _ref.placement
  const basePlacement = placement ? getBasePlacement(placement) : null
  const variation = placement ? getVariation(placement) : null
  const commonX = reference.x + reference.width / 2 - element.width / 2
  const commonY = reference.y + reference.height / 2 - element.height / 2
  let offsets
  switch (basePlacement) {
    case top:
      offsets = {
        x: commonX,
        y: reference.y - element.height
      }
      break

    case bottom:
      offsets = {
        x: commonX,
        y: reference.y + reference.height
      }
      break

    case right:
      offsets = {
        x: reference.x + reference.width,
        y: commonY
      }
      break

    case left:
      offsets = {
        x: reference.x - element.width,
        y: commonY
      }
      break

    default:
      offsets = {
        x: reference.x,
        y: reference.y
      }
  }
  const mainAxis = basePlacement ? getMainAxisFromPlacement(basePlacement) : null
  if (mainAxis != null) {
    const len = mainAxis === 'y' ? 'height' : 'width'
    switch (variation) {
      case start:
        offsets[mainAxis] = offsets[mainAxis] - (reference[len] / 2 - element[len] / 2)
        break

      case end:
        offsets[mainAxis] = offsets[mainAxis] + (reference[len] / 2 - element[len] / 2)
        break
    }
  }
  return offsets
}

function detectOverflow (state, options) {
  if (options === void 0) {
    options = {}
  }
  const _options = options; const _options$placement = _options.placement; const placement = _options$placement === void 0 ? state.placement : _options$placement; const _options$strategy = _options.strategy; const strategy = _options$strategy === void 0 ? state.strategy : _options$strategy; const _options$boundary = _options.boundary; const boundary = _options$boundary === void 0 ? clippingParents : _options$boundary; const _options$rootBoundary = _options.rootBoundary; const rootBoundary = _options$rootBoundary === void 0 ? viewport : _options$rootBoundary; const _options$elementConte = _options.elementContext; const elementContext = _options$elementConte === void 0 ? popper : _options$elementConte; const _options$altBoundary = _options.altBoundary; const altBoundary = _options$altBoundary === void 0 ? false : _options$altBoundary; const _options$padding = _options.padding; const padding = _options$padding === void 0 ? 0 : _options$padding
  const paddingObject = mergePaddingObject(typeof padding !== 'number' ? padding : expandToHashMap(padding, basePlacements))
  const altContext = elementContext === popper ? reference : popper
  const popperRect = state.rects.popper
  const element = state.elements[altBoundary ? altContext : elementContext]
  const clippingClientRect = getClippingRect(isElement$1(element) ? element : element.contextElement || getDocumentElement(state.elements.popper), boundary, rootBoundary, strategy)
  const referenceClientRect = getBoundingClientRect(state.elements.reference)
  const popperOffsets = computeOffsets({
    reference: referenceClientRect,
    element: popperRect,
    strategy: 'absolute',
    placement
  })
  const popperClientRect = rectToClientRect(Object.assign({}, popperRect, popperOffsets))
  const elementClientRect = elementContext === popper ? popperClientRect : referenceClientRect
  const overflowOffsets = {
    top: clippingClientRect.top - elementClientRect.top + paddingObject.top,
    bottom: elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom,
    left: clippingClientRect.left - elementClientRect.left + paddingObject.left,
    right: elementClientRect.right - clippingClientRect.right + paddingObject.right
  }
  const offsetData = state.modifiersData.offset
  if (elementContext === popper && offsetData) {
    const offset = offsetData[placement]
    Object.keys(overflowOffsets).forEach(function (key) {
      const multiply = [right, bottom].indexOf(key) >= 0 ? 1 : -1
      const axis = [top, bottom].indexOf(key) >= 0 ? 'y' : 'x'
      overflowOffsets[key] += offset[axis] * multiply
    })
  }
  return overflowOffsets
}

function computeAutoPlacement (state, options) {
  if (options === void 0) {
    options = {}
  }
  const _options = options; const placement = _options.placement; const boundary = _options.boundary; const rootBoundary = _options.rootBoundary; const padding = _options.padding; const flipVariations = _options.flipVariations; const _options$allowedAutoP = _options.allowedAutoPlacements; const allowedAutoPlacements = _options$allowedAutoP === void 0 ? placements : _options$allowedAutoP
  const variation = getVariation(placement)
  const placements$1 = variation
    ? flipVariations
      ? variationPlacements
      : variationPlacements.filter(function (placement) {
        return getVariation(placement) === variation
      })
    : basePlacements
  let allowedPlacements = placements$1.filter(function (placement) {
    return allowedAutoPlacements.indexOf(placement) >= 0
  })
  if (allowedPlacements.length === 0) {
    allowedPlacements = placements$1
    if (process.env.NODE_ENV !== 'production') {
      console.error(['Popper: The `allowedAutoPlacements` option did not allow any', 'placements. Ensure the `placement` option matches the variation', 'of the allowed placements.', 'For example, "auto" cannot be used to allow "bottom-start".', 'Use "auto-start" instead.'].join(' '))
    }
  }
  const overflows = allowedPlacements.reduce(function (acc, placement) {
    acc[placement] = detectOverflow(state, {
      placement,
      boundary,
      rootBoundary,
      padding
    })[getBasePlacement(placement)]
    return acc
  }, {})
  return Object.keys(overflows).sort(function (a, b) {
    return overflows[a] - overflows[b]
  })
}

function getExpandedFallbackPlacements (placement) {
  if (getBasePlacement(placement) === auto) {
    return []
  }
  const oppositePlacement = getOppositePlacement(placement)
  return [getOppositeVariationPlacement(placement), oppositePlacement, getOppositeVariationPlacement(oppositePlacement)]
}

function flip (_ref) {
  const state = _ref.state; const options = _ref.options; const name = _ref.name
  if (state.modifiersData[name]._skip) {
    return
  }
  const _options$mainAxis = options.mainAxis; const checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis; const _options$altAxis = options.altAxis; const checkAltAxis = _options$altAxis === void 0 ? true : _options$altAxis; const specifiedFallbackPlacements = options.fallbackPlacements; const padding = options.padding; const boundary = options.boundary; const rootBoundary = options.rootBoundary; const altBoundary = options.altBoundary; const _options$flipVariatio = options.flipVariations; const flipVariations = _options$flipVariatio === void 0 ? true : _options$flipVariatio; const allowedAutoPlacements = options.allowedAutoPlacements
  const preferredPlacement = state.options.placement
  const basePlacement = getBasePlacement(preferredPlacement)
  const isBasePlacement = basePlacement === preferredPlacement
  const fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipVariations ? [getOppositePlacement(preferredPlacement)] : getExpandedFallbackPlacements(preferredPlacement))
  const placements = [preferredPlacement].concat(fallbackPlacements).reduce(function (acc, placement) {
    return acc.concat(getBasePlacement(placement) === auto
      ? computeAutoPlacement(state, {
        placement,
        boundary,
        rootBoundary,
        padding,
        flipVariations,
        allowedAutoPlacements
      })
      : placement)
  }, [])
  const referenceRect = state.rects.reference
  const popperRect = state.rects.popper
  const checksMap = new Map()
  let makeFallbackChecks = true
  let firstFittingPlacement = placements[0]
  for (let i = 0; i < placements.length; i++) {
    const placement = placements[i]
    const _basePlacement = getBasePlacement(placement)
    const isStartVariation = getVariation(placement) === start
    const isVertical = [top, bottom].indexOf(_basePlacement) >= 0
    const len = isVertical ? 'width' : 'height'
    const overflow = detectOverflow(state, {
      placement,
      boundary,
      rootBoundary,
      altBoundary,
      padding
    })
    let mainVariationSide = isVertical ? isStartVariation ? right : left : isStartVariation ? bottom : top
    if (referenceRect[len] > popperRect[len]) {
      mainVariationSide = getOppositePlacement(mainVariationSide)
    }
    const altVariationSide = getOppositePlacement(mainVariationSide)
    const checks = []
    if (checkMainAxis) {
      checks.push(overflow[_basePlacement] <= 0)
    }
    if (checkAltAxis) {
      checks.push(overflow[mainVariationSide] <= 0, overflow[altVariationSide] <= 0)
    }
    if (checks.every(function (check) {
      return check
    })) {
      firstFittingPlacement = placement
      makeFallbackChecks = false
      break
    }
    checksMap.set(placement, checks)
  }
  if (makeFallbackChecks) {
    const numberOfChecks = flipVariations ? 3 : 1
    const _loop = function _loop (_i) {
      const fittingPlacement = placements.find(function (placement) {
        const checks = checksMap.get(placement)
        if (checks) {
          return checks.slice(0, _i).every(function (check) {
            return check
          })
        }
      })
      if (fittingPlacement) {
        firstFittingPlacement = fittingPlacement
        return 'break'
      }
    }
    for (let _i = numberOfChecks; _i > 0; _i--) {
      const _ret = _loop(_i)
      if (_ret === 'break') break
    }
  }
  if (state.placement !== firstFittingPlacement) {
    state.modifiersData[name]._skip = true
    state.placement = firstFittingPlacement
    state.reset = true
  }
}

const flip$1 = {
  name: 'flip',
  enabled: true,
  phase: 'main',
  fn: flip,
  requiresIfExists: ['offset'],
  data: {
    _skip: false
  }
}

function getSideOffsets (overflow, rect, preventedOffsets) {
  if (preventedOffsets === void 0) {
    preventedOffsets = {
      x: 0,
      y: 0
    }
  }
  return {
    top: overflow.top - rect.height - preventedOffsets.y,
    right: overflow.right - rect.width + preventedOffsets.x,
    bottom: overflow.bottom - rect.height + preventedOffsets.y,
    left: overflow.left - rect.width - preventedOffsets.x
  }
}

function isAnySideFullyClipped (overflow) {
  return [top, right, bottom, left].some(function (side) {
    return overflow[side] >= 0
  })
}

function hide (_ref) {
  const state = _ref.state; const name = _ref.name
  const referenceRect = state.rects.reference
  const popperRect = state.rects.popper
  const preventedOffsets = state.modifiersData.preventOverflow
  const referenceOverflow = detectOverflow(state, {
    elementContext: 'reference'
  })
  const popperAltOverflow = detectOverflow(state, {
    altBoundary: true
  })
  const referenceClippingOffsets = getSideOffsets(referenceOverflow, referenceRect)
  const popperEscapeOffsets = getSideOffsets(popperAltOverflow, popperRect, preventedOffsets)
  const isReferenceHidden = isAnySideFullyClipped(referenceClippingOffsets)
  const hasPopperEscaped = isAnySideFullyClipped(popperEscapeOffsets)
  state.modifiersData[name] = {
    referenceClippingOffsets,
    popperEscapeOffsets,
    isReferenceHidden,
    hasPopperEscaped
  }
  state.attributes.popper = Object.assign({}, state.attributes.popper, {
    'data-popper-reference-hidden': isReferenceHidden,
    'data-popper-escaped': hasPopperEscaped
  })
}

const hide$1 = {
  name: 'hide',
  enabled: true,
  phase: 'main',
  requiresIfExists: ['preventOverflow'],
  fn: hide
}

function distanceAndSkiddingToXY (placement, rects, offset) {
  const basePlacement = getBasePlacement(placement)
  const invertDistance = [left, top].indexOf(basePlacement) >= 0 ? -1 : 1
  const _ref = typeof offset === 'function'
    ? offset(Object.assign({}, rects, {
      placement
    }))
    : offset; let skidding = _ref[0]; let distance = _ref[1]
  skidding = skidding || 0
  distance = (distance || 0) * invertDistance
  return [left, right].indexOf(basePlacement) >= 0
    ? {
        x: distance,
        y: skidding
      }
    : {
        x: skidding,
        y: distance
      }
}

function offset (_ref2) {
  const state = _ref2.state; const options = _ref2.options; const name = _ref2.name
  const _options$offset = options.offset; const offset = _options$offset === void 0 ? [0, 0] : _options$offset
  const data = placements.reduce(function (acc, placement) {
    acc[placement] = distanceAndSkiddingToXY(placement, state.rects, offset)
    return acc
  }, {})
  const _data$state$placement = data[state.placement]; const x = _data$state$placement.x; const y = _data$state$placement.y
  if (state.modifiersData.popperOffsets != null) {
    state.modifiersData.popperOffsets.x += x
    state.modifiersData.popperOffsets.y += y
  }
  state.modifiersData[name] = data
}

const offset$1 = {
  name: 'offset',
  enabled: true,
  phase: 'main',
  requires: ['popperOffsets'],
  fn: offset
}

function popperOffsets (_ref) {
  const state = _ref.state; const name = _ref.name
  state.modifiersData[name] = computeOffsets({
    reference: state.rects.reference,
    element: state.rects.popper,
    strategy: 'absolute',
    placement: state.placement
  })
}

const popperOffsets$1 = {
  name: 'popperOffsets',
  enabled: true,
  phase: 'read',
  fn: popperOffsets,
  data: {}
}

function getAltAxis (axis) {
  return axis === 'x' ? 'y' : 'x'
}

function preventOverflow (_ref) {
  const state = _ref.state; const options = _ref.options; const name = _ref.name
  const _options$mainAxis = options.mainAxis; const checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis; const _options$altAxis = options.altAxis; const checkAltAxis = _options$altAxis === void 0 ? false : _options$altAxis; const boundary = options.boundary; const rootBoundary = options.rootBoundary; const altBoundary = options.altBoundary; const padding = options.padding; const _options$tether = options.tether; const tether = _options$tether === void 0 ? true : _options$tether; const _options$tetherOffset = options.tetherOffset; const tetherOffset = _options$tetherOffset === void 0 ? 0 : _options$tetherOffset
  const overflow = detectOverflow(state, {
    boundary,
    rootBoundary,
    padding,
    altBoundary
  })
  const basePlacement = getBasePlacement(state.placement)
  const variation = getVariation(state.placement)
  const isBasePlacement = !variation
  const mainAxis = getMainAxisFromPlacement(basePlacement)
  const altAxis = getAltAxis(mainAxis)
  const popperOffsets = state.modifiersData.popperOffsets
  const referenceRect = state.rects.reference
  const popperRect = state.rects.popper
  const tetherOffsetValue = typeof tetherOffset === 'function'
    ? tetherOffset(Object.assign({}, state.rects, {
      placement: state.placement
    }))
    : tetherOffset
  const normalizedTetherOffsetValue = typeof tetherOffsetValue === 'number'
    ? {
        mainAxis: tetherOffsetValue,
        altAxis: tetherOffsetValue
      }
    : Object.assign({
      mainAxis: 0,
      altAxis: 0
    }, tetherOffsetValue)
  const offsetModifierState = state.modifiersData.offset ? state.modifiersData.offset[state.placement] : null
  const data = {
    x: 0,
    y: 0
  }
  if (!popperOffsets) {
    return
  }
  if (checkMainAxis) {
    let _offsetModifierState$
    const mainSide = mainAxis === 'y' ? top : left
    const altSide = mainAxis === 'y' ? bottom : right
    const len = mainAxis === 'y' ? 'height' : 'width'
    const offset = popperOffsets[mainAxis]
    const min$1 = offset + overflow[mainSide]
    const max$1 = offset - overflow[altSide]
    const additive = tether ? -popperRect[len] / 2 : 0
    const minLen = variation === start ? referenceRect[len] : popperRect[len]
    const maxLen = variation === start ? -popperRect[len] : -referenceRect[len]
    const arrowElement = state.elements.arrow
    const arrowRect = tether && arrowElement
      ? getLayoutRect(arrowElement)
      : {
          width: 0,
          height: 0
        }
    const arrowPaddingObject = state.modifiersData['arrow#persistent'] ? state.modifiersData['arrow#persistent'].padding : getFreshSideObject()
    const arrowPaddingMin = arrowPaddingObject[mainSide]
    const arrowPaddingMax = arrowPaddingObject[altSide]
    const arrowLen = within(0, referenceRect[len], arrowRect[len])
    const minOffset = isBasePlacement ? referenceRect[len] / 2 - additive - arrowLen - arrowPaddingMin - normalizedTetherOffsetValue.mainAxis : minLen - arrowLen - arrowPaddingMin - normalizedTetherOffsetValue.mainAxis
    const maxOffset = isBasePlacement ? -referenceRect[len] / 2 + additive + arrowLen + arrowPaddingMax + normalizedTetherOffsetValue.mainAxis : maxLen + arrowLen + arrowPaddingMax + normalizedTetherOffsetValue.mainAxis
    const arrowOffsetParent = state.elements.arrow && getOffsetParent(state.elements.arrow)
    const clientOffset = arrowOffsetParent ? mainAxis === 'y' ? arrowOffsetParent.clientTop || 0 : arrowOffsetParent.clientLeft || 0 : 0
    const offsetModifierValue = (_offsetModifierState$ = offsetModifierState == null ? void 0 : offsetModifierState[mainAxis]) != null ? _offsetModifierState$ : 0
    const tetherMin = offset + minOffset - offsetModifierValue - clientOffset
    const tetherMax = offset + maxOffset - offsetModifierValue
    const preventedOffset = within(tether ? min(min$1, tetherMin) : min$1, offset, tether ? max(max$1, tetherMax) : max$1)
    popperOffsets[mainAxis] = preventedOffset
    data[mainAxis] = preventedOffset - offset
  }
  if (checkAltAxis) {
    let _offsetModifierState$2
    const _mainSide = mainAxis === 'x' ? top : left
    const _altSide = mainAxis === 'x' ? bottom : right
    const _offset = popperOffsets[altAxis]
    const _len = altAxis === 'y' ? 'height' : 'width'
    const _min = _offset + overflow[_mainSide]
    const _max = _offset - overflow[_altSide]
    const isOriginSide = [top, left].indexOf(basePlacement) !== -1
    const _offsetModifierValue = (_offsetModifierState$2 = offsetModifierState == null ? void 0 : offsetModifierState[altAxis]) != null ? _offsetModifierState$2 : 0
    const _tetherMin = isOriginSide ? _min : _offset - referenceRect[_len] - popperRect[_len] - _offsetModifierValue + normalizedTetherOffsetValue.altAxis
    const _tetherMax = isOriginSide ? _offset + referenceRect[_len] + popperRect[_len] - _offsetModifierValue - normalizedTetherOffsetValue.altAxis : _max
    const _preventedOffset = tether && isOriginSide ? withinMaxClamp(_tetherMin, _offset, _tetherMax) : within(tether ? _tetherMin : _min, _offset, tether ? _tetherMax : _max)
    popperOffsets[altAxis] = _preventedOffset
    data[altAxis] = _preventedOffset - _offset
  }
  state.modifiersData[name] = data
}

const preventOverflow$1 = {
  name: 'preventOverflow',
  enabled: true,
  phase: 'main',
  fn: preventOverflow,
  requiresIfExists: ['offset']
}

function getHTMLElementScroll (element) {
  return {
    scrollLeft: element.scrollLeft,
    scrollTop: element.scrollTop
  }
}

function getNodeScroll (node) {
  if (node === getWindow(node) || !isHTMLElement(node)) {
    return getWindowScroll(node)
  } else {
    return getHTMLElementScroll(node)
  }
}

function isElementScaled (element) {
  const rect = element.getBoundingClientRect()
  const scaleX = round(rect.width) / element.offsetWidth || 1
  const scaleY = round(rect.height) / element.offsetHeight || 1
  return scaleX !== 1 || scaleY !== 1
}

function getCompositeRect (elementOrVirtualElement, offsetParent, isFixed) {
  if (isFixed === void 0) {
    isFixed = false
  }
  const isOffsetParentAnElement = isHTMLElement(offsetParent)
  const offsetParentIsScaled = isHTMLElement(offsetParent) && isElementScaled(offsetParent)
  const documentElement = getDocumentElement(offsetParent)
  const rect = getBoundingClientRect(elementOrVirtualElement, offsetParentIsScaled, isFixed)
  let scroll = {
    scrollLeft: 0,
    scrollTop: 0
  }
  let offsets = {
    x: 0,
    y: 0
  }
  if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
    if (getNodeName(offsetParent) !== 'body' || isScrollParent(documentElement)) {
      scroll = getNodeScroll(offsetParent)
    }
    if (isHTMLElement(offsetParent)) {
      offsets = getBoundingClientRect(offsetParent, true)
      offsets.x += offsetParent.clientLeft
      offsets.y += offsetParent.clientTop
    } else if (documentElement) {
      offsets.x = getWindowScrollBarX(documentElement)
    }
  }
  return {
    x: rect.left + scroll.scrollLeft - offsets.x,
    y: rect.top + scroll.scrollTop - offsets.y,
    width: rect.width,
    height: rect.height
  }
}

function order (modifiers) {
  const map = new Map()
  const visited = new Set()
  const result = []
  modifiers.forEach(function (modifier) {
    map.set(modifier.name, modifier)
  })
  function sort (modifier) {
    visited.add(modifier.name)
    const requires = [].concat(modifier.requires || [], modifier.requiresIfExists || [])
    requires.forEach(function (dep) {
      if (!visited.has(dep)) {
        const depModifier = map.get(dep)
        if (depModifier) {
          sort(depModifier)
        }
      }
    })
    result.push(modifier)
  }
  modifiers.forEach(function (modifier) {
    if (!visited.has(modifier.name)) {
      sort(modifier)
    }
  })
  return result
}

function orderModifiers (modifiers) {
  const orderedModifiers = order(modifiers)
  return modifierPhases.reduce(function (acc, phase) {
    return acc.concat(orderedModifiers.filter(function (modifier) {
      return modifier.phase === phase
    }))
  }, [])
}

function debounce$1 (fn) {
  let pending
  return function () {
    if (!pending) {
      pending = new Promise(function (resolve) {
        Promise.resolve().then(function () {
          pending = undefined
          resolve(fn())
        })
      })
    }
    return pending
  }
}

function format (str) {
  for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key]
  }
  return [].concat(args).reduce(function (p, c) {
    return p.replace(/%s/, c)
  }, str)
}

const INVALID_MODIFIER_ERROR = 'Popper: modifier "%s" provided an invalid %s property, expected %s but got %s'

const MISSING_DEPENDENCY_ERROR = 'Popper: modifier "%s" requires "%s", but "%s" modifier is not available'

const VALID_PROPERTIES = ['name', 'enabled', 'phase', 'fn', 'effect', 'requires', 'options']

function validateModifiers (modifiers) {
  modifiers.forEach(function (modifier) {
    [].concat(Object.keys(modifier), VALID_PROPERTIES).filter(function (value, index, self) {
      return self.indexOf(value) === index
    }).forEach(function (key) {
      switch (key) {
        case 'name':
          if (typeof modifier.name !== 'string') {
            console.error(format(INVALID_MODIFIER_ERROR, String(modifier.name), '"name"', '"string"', '"' + String(modifier.name) + '"'))
          }
          break

        case 'enabled':
          if (typeof modifier.enabled !== 'boolean') {
            console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"enabled"', '"boolean"', '"' + String(modifier.enabled) + '"'))
          }
          break

        case 'phase':
          if (modifierPhases.indexOf(modifier.phase) < 0) {
            console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"phase"', 'either ' + modifierPhases.join(', '), '"' + String(modifier.phase) + '"'))
          }
          break

        case 'fn':
          if (typeof modifier.fn !== 'function') {
            console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"fn"', '"function"', '"' + String(modifier.fn) + '"'))
          }
          break

        case 'effect':
          if (modifier.effect != null && typeof modifier.effect !== 'function') {
            console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"effect"', '"function"', '"' + String(modifier.fn) + '"'))
          }
          break

        case 'requires':
          if (modifier.requires != null && !Array.isArray(modifier.requires)) {
            console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"requires"', '"array"', '"' + String(modifier.requires) + '"'))
          }
          break

        case 'requiresIfExists':
          if (!Array.isArray(modifier.requiresIfExists)) {
            console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"requiresIfExists"', '"array"', '"' + String(modifier.requiresIfExists) + '"'))
          }
          break

        case 'options':
        case 'data':
          break

        default:
          console.error('PopperJS: an invalid property has been provided to the "' + modifier.name + '" modifier, valid properties are ' + VALID_PROPERTIES.map(function (s) {
            return '"' + s + '"'
          }).join(', ') + '; but "' + key + '" was provided.')
      }
      modifier.requires && modifier.requires.forEach(function (requirement) {
        if (modifiers.find(function (mod) {
          return mod.name === requirement
        }) == null) {
          console.error(format(MISSING_DEPENDENCY_ERROR, String(modifier.name), requirement, requirement))
        }
      })
    })
  })
}

function uniqueBy (arr, fn) {
  const identifiers = new Set()
  return arr.filter(function (item) {
    const identifier = fn(item)
    if (!identifiers.has(identifier)) {
      identifiers.add(identifier)
      return true
    }
  })
}

function mergeByName (modifiers) {
  const merged = modifiers.reduce(function (merged, current) {
    const existing = merged[current.name]
    merged[current.name] = existing
      ? Object.assign({}, existing, current, {
        options: Object.assign({}, existing.options, current.options),
        data: Object.assign({}, existing.data, current.data)
      })
      : current
    return merged
  }, {})
  return Object.keys(merged).map(function (key) {
    return merged[key]
  })
}

const INVALID_ELEMENT_ERROR = 'Popper: Invalid reference or popper argument provided. They must be either a DOM element or virtual element.'

const INFINITE_LOOP_ERROR = 'Popper: An infinite loop in the modifiers cycle has been detected! The cycle has been interrupted to prevent a browser crash.'

const DEFAULT_OPTIONS = {
  placement: 'bottom',
  modifiers: [],
  strategy: 'absolute'
}

function areValidElements () {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key]
  }
  return !args.some(function (element) {
    return !(element && typeof element.getBoundingClientRect === 'function')
  })
}

function popperGenerator (generatorOptions) {
  if (generatorOptions === void 0) {
    generatorOptions = {}
  }
  const _generatorOptions = generatorOptions; const _generatorOptions$def = _generatorOptions.defaultModifiers; const defaultModifiers = _generatorOptions$def === void 0 ? [] : _generatorOptions$def; const _generatorOptions$def2 = _generatorOptions.defaultOptions; const defaultOptions = _generatorOptions$def2 === void 0 ? DEFAULT_OPTIONS : _generatorOptions$def2
  return function createPopper (reference, popper, options) {
    if (options === void 0) {
      options = defaultOptions
    }
    let state = {
      placement: 'bottom',
      orderedModifiers: [],
      options: Object.assign({}, DEFAULT_OPTIONS, defaultOptions),
      modifiersData: {},
      elements: {
        reference,
        popper
      },
      attributes: {},
      styles: {}
    }
    let effectCleanupFns = []
    let isDestroyed = false
    var instance = {
      state,
      setOptions: function setOptions (setOptionsAction) {
        const options = typeof setOptionsAction === 'function' ? setOptionsAction(state.options) : setOptionsAction
        cleanupModifierEffects()
        state.options = Object.assign({}, defaultOptions, state.options, options)
        state.scrollParents = {
          reference: isElement$1(reference) ? listScrollParents(reference) : reference.contextElement ? listScrollParents(reference.contextElement) : [],
          popper: listScrollParents(popper)
        }
        const orderedModifiers = orderModifiers(mergeByName([].concat(defaultModifiers, state.options.modifiers)))
        state.orderedModifiers = orderedModifiers.filter(function (m) {
          return m.enabled
        })
        if (process.env.NODE_ENV !== 'production') {
          const modifiers = uniqueBy([].concat(orderedModifiers, state.options.modifiers), function (_ref) {
            const name = _ref.name
            return name
          })
          validateModifiers(modifiers)
          if (getBasePlacement(state.options.placement) === auto) {
            const flipModifier = state.orderedModifiers.find(function (_ref2) {
              const name = _ref2.name
              return name === 'flip'
            })
            if (!flipModifier) {
              console.error(['Popper: "auto" placements require the "flip" modifier be', 'present and enabled to work.'].join(' '))
            }
          }
          const _getComputedStyle = getComputedStyle$1(popper); const marginTop = _getComputedStyle.marginTop; const marginRight = _getComputedStyle.marginRight; const marginBottom = _getComputedStyle.marginBottom; const marginLeft = _getComputedStyle.marginLeft
          if ([marginTop, marginRight, marginBottom, marginLeft].some(function (margin) {
            return parseFloat(margin)
          })) {
            console.warn(['Popper: CSS "margin" styles cannot be used to apply padding', 'between the popper and its reference element or boundary.', 'To replicate margin, use the `offset` modifier, as well as', 'the `padding` option in the `preventOverflow` and `flip`', 'modifiers.'].join(' '))
          }
        }
        runModifierEffects()
        return instance.update()
      },
      forceUpdate: function forceUpdate () {
        if (isDestroyed) {
          return
        }
        const _state$elements = state.elements; const reference = _state$elements.reference; const popper = _state$elements.popper
        if (!areValidElements(reference, popper)) {
          if (process.env.NODE_ENV !== 'production') {
            console.error(INVALID_ELEMENT_ERROR)
          }
          return
        }
        state.rects = {
          reference: getCompositeRect(reference, getOffsetParent(popper), state.options.strategy === 'fixed'),
          popper: getLayoutRect(popper)
        }
        state.reset = false
        state.placement = state.options.placement
        state.orderedModifiers.forEach(function (modifier) {
          return state.modifiersData[modifier.name] = Object.assign({}, modifier.data)
        })
        let __debug_loops__ = 0
        for (let index = 0; index < state.orderedModifiers.length; index++) {
          if (process.env.NODE_ENV !== 'production') {
            __debug_loops__ += 1
            if (__debug_loops__ > 100) {
              console.error(INFINITE_LOOP_ERROR)
              break
            }
          }
          if (state.reset === true) {
            state.reset = false
            index = -1
            continue
          }
          const _state$orderedModifie = state.orderedModifiers[index]; const fn = _state$orderedModifie.fn; const _state$orderedModifie2 = _state$orderedModifie.options; const _options = _state$orderedModifie2 === void 0 ? {} : _state$orderedModifie2; const name = _state$orderedModifie.name
          if (typeof fn === 'function') {
            state = fn({
              state,
              options: _options,
              name,
              instance
            }) || state
          }
        }
      },
      update: debounce$1(function () {
        return new Promise(function (resolve) {
          instance.forceUpdate()
          resolve(state)
        })
      }),
      destroy: function destroy () {
        cleanupModifierEffects()
        isDestroyed = true
      }
    }
    if (!areValidElements(reference, popper)) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(INVALID_ELEMENT_ERROR)
      }
      return instance
    }
    instance.setOptions(options).then(function (state) {
      if (!isDestroyed && options.onFirstUpdate) {
        options.onFirstUpdate(state)
      }
    })
    function runModifierEffects () {
      state.orderedModifiers.forEach(function (_ref3) {
        const name = _ref3.name; const _ref3$options = _ref3.options; const options = _ref3$options === void 0 ? {} : _ref3$options; const effect = _ref3.effect
        if (typeof effect === 'function') {
          const cleanupFn = effect({
            state,
            name,
            instance,
            options
          })
          const noopFn = function noopFn () {}
          effectCleanupFns.push(cleanupFn || noopFn)
        }
      })
    }
    function cleanupModifierEffects () {
      effectCleanupFns.forEach(function (fn) {
        return fn()
      })
      effectCleanupFns = []
    }
    return instance
  }
}

const createPopper$2 = popperGenerator()

const defaultModifiers$1 = [eventListeners, popperOffsets$1, computeStyles$1, applyStyles$1]

const createPopper$1 = popperGenerator({
  defaultModifiers: defaultModifiers$1
})

const defaultModifiers = [eventListeners, popperOffsets$1, computeStyles$1, applyStyles$1, offset$1, flip$1, preventOverflow$1, arrow$1, hide$1]

const createPopper = popperGenerator({
  defaultModifiers
})

const Popper = Object.freeze({
  __proto__: null,
  popperGenerator,
  detectOverflow,
  createPopperBase: createPopper$2,
  createPopper,
  createPopperLite: createPopper$1,
  top,
  bottom,
  right,
  left,
  auto,
  basePlacements,
  start,
  end,
  clippingParents,
  viewport,
  popper,
  reference,
  variationPlacements,
  placements,
  beforeRead,
  read,
  afterRead,
  beforeMain,
  main,
  afterMain,
  beforeWrite,
  write,
  afterWrite,
  modifierPhases,
  applyStyles: applyStyles$1,
  arrow: arrow$1,
  computeStyles: computeStyles$1,
  eventListeners,
  flip: flip$1,
  hide: hide$1,
  offset: offset$1,
  popperOffsets: popperOffsets$1,
  preventOverflow: preventOverflow$1
})

/*!
  * Bootstrap v5.2.3 (https://getbootstrap.com/)
  * Copyright 2011-2022 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  */ const MAX_UID = 1e6

const MILLISECONDS_MULTIPLIER = 1e3

const TRANSITION_END = 'transitionend'

const toType = object => {
  if (object === null || object === undefined) {
    return `${object}`
  }
  return Object.prototype.toString.call(object).match(/\s([a-z]+)/i)[1].toLowerCase()
}

const getUID = prefix => {
  do {
    prefix += Math.floor(Math.random() * MAX_UID)
  } while (document.getElementById(prefix))
  return prefix
}

const getSelector = element => {
  let selector = element.getAttribute('data-bs-target')
  if (!selector || selector === '#') {
    let hrefAttribute = element.getAttribute('href')
    if (!hrefAttribute || !hrefAttribute.includes('#') && !hrefAttribute.startsWith('.')) {
      return null
    }
    if (hrefAttribute.includes('#') && !hrefAttribute.startsWith('#')) {
      hrefAttribute = `#${hrefAttribute.split('#')[1]}`
    }
    selector = hrefAttribute && hrefAttribute !== '#' ? hrefAttribute.trim() : null
  }
  return selector
}

const getSelectorFromElement = element => {
  const selector = getSelector(element)
  if (selector) {
    return document.querySelector(selector) ? selector : null
  }
  return null
}

const getElementFromSelector = element => {
  const selector = getSelector(element)
  return selector ? document.querySelector(selector) : null
}

const getTransitionDurationFromElement = element => {
  if (!element) {
    return 0
  }
  let { transitionDuration, transitionDelay } = window.getComputedStyle(element)
  const floatTransitionDuration = Number.parseFloat(transitionDuration)
  const floatTransitionDelay = Number.parseFloat(transitionDelay)
  if (!floatTransitionDuration && !floatTransitionDelay) {
    return 0
  }
  transitionDuration = transitionDuration.split(',')[0]
  transitionDelay = transitionDelay.split(',')[0]
  return (Number.parseFloat(transitionDuration) + Number.parseFloat(transitionDelay)) * MILLISECONDS_MULTIPLIER
}

const triggerTransitionEnd = element => {
  element.dispatchEvent(new Event(TRANSITION_END))
}

const isElement = object => {
  if (!object || typeof object !== 'object') {
    return false
  }
  if (typeof object.jquery !== 'undefined') {
    object = object[0]
  }
  return typeof object.nodeType !== 'undefined'
}

const getElement = object => {
  if (isElement(object)) {
    return object.jquery ? object[0] : object
  }
  if (typeof object === 'string' && object.length > 0) {
    return document.querySelector(object)
  }
  return null
}

const isVisible = element => {
  if (!isElement(element) || element.getClientRects().length === 0) {
    return false
  }
  const elementIsVisible = getComputedStyle(element).getPropertyValue('visibility') === 'visible'
  const closedDetails = element.closest('details:not([open])')
  if (!closedDetails) {
    return elementIsVisible
  }
  if (closedDetails !== element) {
    const summary = element.closest('summary')
    if (summary && summary.parentNode !== closedDetails) {
      return false
    }
    if (summary === null) {
      return false
    }
  }
  return elementIsVisible
}

const isDisabled = element => {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) {
    return true
  }
  if (element.classList.contains('disabled')) {
    return true
  }
  if (typeof element.disabled !== 'undefined') {
    return element.disabled
  }
  return element.hasAttribute('disabled') && element.getAttribute('disabled') !== 'false'
}

const findShadowRoot = element => {
  if (!document.documentElement.attachShadow) {
    return null
  }
  if (typeof element.getRootNode === 'function') {
    const root = element.getRootNode()
    return root instanceof ShadowRoot ? root : null
  }
  if (element instanceof ShadowRoot) {
    return element
  }
  if (!element.parentNode) {
    return null
  }
  return findShadowRoot(element.parentNode)
}

const noop = () => {}

const reflow = element => {
  element.offsetHeight
}

const getjQuery = () => {
  if (window.jQuery && !document.body.hasAttribute('data-bs-no-jquery')) {
    return window.jQuery
  }
  return null
}

const DOMContentLoadedCallbacks = []

const onDOMContentLoaded = callback => {
  if (document.readyState === 'loading') {
    if (!DOMContentLoadedCallbacks.length) {
      document.addEventListener('DOMContentLoaded', () => {
        for (const callback of DOMContentLoadedCallbacks) {
          callback()
        }
      })
    }
    DOMContentLoadedCallbacks.push(callback)
  } else {
    callback()
  }
}

const isRTL = () => document.documentElement.dir === 'rtl'

const defineJQueryPlugin = plugin => {
  onDOMContentLoaded(() => {
    const $ = getjQuery()
    if ($) {
      const name = plugin.NAME
      const JQUERY_NO_CONFLICT = $.fn[name]
      $.fn[name] = plugin.jQueryInterface
      $.fn[name].Constructor = plugin
      $.fn[name].noConflict = () => {
        $.fn[name] = JQUERY_NO_CONFLICT
        return plugin.jQueryInterface
      }
    }
  })
}

const execute = callback => {
  if (typeof callback === 'function') {
    callback()
  }
}

const executeAfterTransition = (callback, transitionElement, waitForTransition = true) => {
  if (!waitForTransition) {
    execute(callback)
    return
  }
  const durationPadding = 5
  const emulatedDuration = getTransitionDurationFromElement(transitionElement) + durationPadding
  let called = false
  const handler = ({ target }) => {
    if (target !== transitionElement) {
      return
    }
    called = true
    transitionElement.removeEventListener(TRANSITION_END, handler)
    execute(callback)
  }
  transitionElement.addEventListener(TRANSITION_END, handler)
  setTimeout(() => {
    if (!called) {
      triggerTransitionEnd(transitionElement)
    }
  }, emulatedDuration)
}

const getNextActiveElement = (list, activeElement, shouldGetNext, isCycleAllowed) => {
  const listLength = list.length
  let index = list.indexOf(activeElement)
  if (index === -1) {
    return !shouldGetNext && isCycleAllowed ? list[listLength - 1] : list[0]
  }
  index += shouldGetNext ? 1 : -1
  if (isCycleAllowed) {
    index = (index + listLength) % listLength
  }
  return list[Math.max(0, Math.min(index, listLength - 1))]
}

const namespaceRegex = /[^.]*(?=\..*)\.|.*/

const stripNameRegex = /\..*/

const stripUidRegex = /::\d+$/

const eventRegistry = {}

let uidEvent = 1

const customEvents = {
  mouseenter: 'mouseover',
  mouseleave: 'mouseout'
}

const nativeEvents = new Set(['click', 'dblclick', 'mouseup', 'mousedown', 'contextmenu', 'mousewheel', 'DOMMouseScroll', 'mouseover', 'mouseout', 'mousemove', 'selectstart', 'selectend', 'keydown', 'keypress', 'keyup', 'orientationchange', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'pointerdown', 'pointermove', 'pointerup', 'pointerleave', 'pointercancel', 'gesturestart', 'gesturechange', 'gestureend', 'focus', 'blur', 'change', 'reset', 'select', 'submit', 'focusin', 'focusout', 'load', 'unload', 'beforeunload', 'resize', 'move', 'DOMContentLoaded', 'readystatechange', 'error', 'abort', 'scroll'])

function makeEventUid (element, uid) {
  return uid && `${uid}::${uidEvent++}` || element.uidEvent || uidEvent++
}

function getElementEvents (element) {
  const uid = makeEventUid(element)
  element.uidEvent = uid
  eventRegistry[uid] = eventRegistry[uid] || {}
  return eventRegistry[uid]
}

function bootstrapHandler (element, fn) {
  return function handler (event) {
    hydrateObj(event, {
      delegateTarget: element
    })
    if (handler.oneOff) {
      EventHandler.off(element, event.type, fn)
    }
    return fn.apply(element, [event])
  }
}

function bootstrapDelegationHandler (element, selector, fn) {
  return function handler (event) {
    const domElements = element.querySelectorAll(selector)
    for (let { target } = event; target && target !== this; target = target.parentNode) {
      for (const domElement of domElements) {
        if (domElement !== target) {
          continue
        }
        hydrateObj(event, {
          delegateTarget: target
        })
        if (handler.oneOff) {
          EventHandler.off(element, event.type, selector, fn)
        }
        return fn.apply(target, [event])
      }
    }
  }
}

function findHandler (events, callable, delegationSelector = null) {
  return Object.values(events).find(event => event.callable === callable && event.delegationSelector === delegationSelector)
}

function normalizeParameters (originalTypeEvent, handler, delegationFunction) {
  const isDelegated = typeof handler === 'string'
  const callable = isDelegated ? delegationFunction : handler || delegationFunction
  let typeEvent = getTypeEvent(originalTypeEvent)
  if (!nativeEvents.has(typeEvent)) {
    typeEvent = originalTypeEvent
  }
  return [isDelegated, callable, typeEvent]
}

function addHandler (element, originalTypeEvent, handler, delegationFunction, oneOff) {
  if (typeof originalTypeEvent !== 'string' || !element) {
    return
  }
  let [isDelegated, callable, typeEvent] = normalizeParameters(originalTypeEvent, handler, delegationFunction)
  if (originalTypeEvent in customEvents) {
    const wrapFunction = fn => function (event) {
      if (!event.relatedTarget || event.relatedTarget !== event.delegateTarget && !event.delegateTarget.contains(event.relatedTarget)) {
        return fn.call(this, event)
      }
    }
    callable = wrapFunction(callable)
  }
  const events = getElementEvents(element)
  const handlers = events[typeEvent] || (events[typeEvent] = {})
  const previousFunction = findHandler(handlers, callable, isDelegated ? handler : null)
  if (previousFunction) {
    previousFunction.oneOff = previousFunction.oneOff && oneOff
    return
  }
  const uid = makeEventUid(callable, originalTypeEvent.replace(namespaceRegex, ''))
  const fn = isDelegated ? bootstrapDelegationHandler(element, handler, callable) : bootstrapHandler(element, callable)
  fn.delegationSelector = isDelegated ? handler : null
  fn.callable = callable
  fn.oneOff = oneOff
  fn.uidEvent = uid
  handlers[uid] = fn
  element.addEventListener(typeEvent, fn, isDelegated)
}

function removeHandler (element, events, typeEvent, handler, delegationSelector) {
  const fn = findHandler(events[typeEvent], handler, delegationSelector)
  if (!fn) {
    return
  }
  element.removeEventListener(typeEvent, fn, Boolean(delegationSelector))
  delete events[typeEvent][fn.uidEvent]
}

function removeNamespacedHandlers (element, events, typeEvent, namespace) {
  const storeElementEvent = events[typeEvent] || {}
  for (const handlerKey of Object.keys(storeElementEvent)) {
    if (handlerKey.includes(namespace)) {
      const event = storeElementEvent[handlerKey]
      removeHandler(element, events, typeEvent, event.callable, event.delegationSelector)
    }
  }
}

function getTypeEvent (event) {
  event = event.replace(stripNameRegex, '')
  return customEvents[event] || event
}

const EventHandler = {
  on (element, event, handler, delegationFunction) {
    addHandler(element, event, handler, delegationFunction, false)
  },
  one (element, event, handler, delegationFunction) {
    addHandler(element, event, handler, delegationFunction, true)
  },
  off (element, originalTypeEvent, handler, delegationFunction) {
    if (typeof originalTypeEvent !== 'string' || !element) {
      return
    }
    const [isDelegated, callable, typeEvent] = normalizeParameters(originalTypeEvent, handler, delegationFunction)
    const inNamespace = typeEvent !== originalTypeEvent
    const events = getElementEvents(element)
    const storeElementEvent = events[typeEvent] || {}
    const isNamespace = originalTypeEvent.startsWith('.')
    if (typeof callable !== 'undefined') {
      if (!Object.keys(storeElementEvent).length) {
        return
      }
      removeHandler(element, events, typeEvent, callable, isDelegated ? handler : null)
      return
    }
    if (isNamespace) {
      for (const elementEvent of Object.keys(events)) {
        removeNamespacedHandlers(element, events, elementEvent, originalTypeEvent.slice(1))
      }
    }
    for (const keyHandlers of Object.keys(storeElementEvent)) {
      const handlerKey = keyHandlers.replace(stripUidRegex, '')
      if (!inNamespace || originalTypeEvent.includes(handlerKey)) {
        const event = storeElementEvent[keyHandlers]
        removeHandler(element, events, typeEvent, event.callable, event.delegationSelector)
      }
    }
  },
  trigger (element, event, args) {
    if (typeof event !== 'string' || !element) {
      return null
    }
    const $ = getjQuery()
    const typeEvent = getTypeEvent(event)
    const inNamespace = event !== typeEvent
    let jQueryEvent = null
    let bubbles = true
    let nativeDispatch = true
    let defaultPrevented = false
    if (inNamespace && $) {
      jQueryEvent = $.Event(event, args)
      $(element).trigger(jQueryEvent)
      bubbles = !jQueryEvent.isPropagationStopped()
      nativeDispatch = !jQueryEvent.isImmediatePropagationStopped()
      defaultPrevented = jQueryEvent.isDefaultPrevented()
    }
    let evt = new Event(event, {
      bubbles,
      cancelable: true
    })
    evt = hydrateObj(evt, args)
    if (defaultPrevented) {
      evt.preventDefault()
    }
    if (nativeDispatch) {
      element.dispatchEvent(evt)
    }
    if (evt.defaultPrevented && jQueryEvent) {
      jQueryEvent.preventDefault()
    }
    return evt
  }
}

function hydrateObj (obj, meta) {
  for (const [key, value] of Object.entries(meta || {})) {
    try {
      obj[key] = value
    } catch (_unused) {
      Object.defineProperty(obj, key, {
        configurable: true,
        get () {
          return value
        }
      })
    }
  }
  return obj
}

const elementMap = new Map()

const Data = {
  set (element, key, instance) {
    if (!elementMap.has(element)) {
      elementMap.set(element, new Map())
    }
    const instanceMap = elementMap.get(element)
    if (!instanceMap.has(key) && instanceMap.size !== 0) {
      console.error(`Bootstrap doesn't allow more than one instance per element. Bound instance: ${Array.from(instanceMap.keys())[0]}.`)
      return
    }
    instanceMap.set(key, instance)
  },
  get (element, key) {
    if (elementMap.has(element)) {
      return elementMap.get(element).get(key) || null
    }
    return null
  },
  remove (element, key) {
    if (!elementMap.has(element)) {
      return
    }
    const instanceMap = elementMap.get(element)
    instanceMap.delete(key)
    if (instanceMap.size === 0) {
      elementMap.delete(element)
    }
  }
}

function normalizeData (value) {
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
  if (value === Number(value).toString()) {
    return Number(value)
  }
  if (value === '' || value === 'null') {
    return null
  }
  if (typeof value !== 'string') {
    return value
  }
  try {
    return JSON.parse(decodeURIComponent(value))
  } catch (_unused) {
    return value
  }
}

function normalizeDataKey (key) {
  return key.replace(/[A-Z]/g, chr => `-${chr.toLowerCase()}`)
}

const Manipulator = {
  setDataAttribute (element, key, value) {
    element.setAttribute(`data-bs-${normalizeDataKey(key)}`, value)
  },
  removeDataAttribute (element, key) {
    element.removeAttribute(`data-bs-${normalizeDataKey(key)}`)
  },
  getDataAttributes (element) {
    if (!element) {
      return {}
    }
    const attributes = {}
    const bsKeys = Object.keys(element.dataset).filter(key => key.startsWith('bs') && !key.startsWith('bsConfig'))
    for (const key of bsKeys) {
      let pureKey = key.replace(/^bs/, '')
      pureKey = pureKey.charAt(0).toLowerCase() + pureKey.slice(1, pureKey.length)
      attributes[pureKey] = normalizeData(element.dataset[key])
    }
    return attributes
  },
  getDataAttribute (element, key) {
    return normalizeData(element.getAttribute(`data-bs-${normalizeDataKey(key)}`))
  }
}

class Config {
  static get Default () {
    return {}
  }

  static get DefaultType () {
    return {}
  }

  static get NAME () {
    throw new Error('You have to implement the static method "NAME", for each component!')
  }

  _getConfig (config) {
    config = this._mergeConfigObj(config)
    config = this._configAfterMerge(config)
    this._typeCheckConfig(config)
    return config
  }

  _configAfterMerge (config) {
    return config
  }

  _mergeConfigObj (config, element) {
    const jsonConfig = isElement(element) ? Manipulator.getDataAttribute(element, 'config') : {}
    return {
      ...this.constructor.Default,
      ...typeof jsonConfig === 'object' ? jsonConfig : {},
      ...isElement(element) ? Manipulator.getDataAttributes(element) : {},
      ...typeof config === 'object' ? config : {}
    }
  }

  _typeCheckConfig (config, configTypes = this.constructor.DefaultType) {
    for (const property of Object.keys(configTypes)) {
      const expectedTypes = configTypes[property]
      const value = config[property]
      const valueType = isElement(value) ? 'element' : toType(value)
      if (!new RegExp(expectedTypes).test(valueType)) {
        throw new TypeError(`${this.constructor.NAME.toUpperCase()}: Option "${property}" provided type "${valueType}" but expected type "${expectedTypes}".`)
      }
    }
  }
}

const VERSION = '5.2.3'

class BaseComponent extends Config {
  constructor (element, config) {
    super()
    element = getElement(element)
    if (!element) {
      return
    }
    this._element = element
    this._config = this._getConfig(config)
    Data.set(this._element, this.constructor.DATA_KEY, this)
  }

  dispose () {
    Data.remove(this._element, this.constructor.DATA_KEY)
    EventHandler.off(this._element, this.constructor.EVENT_KEY)
    for (const propertyName of Object.getOwnPropertyNames(this)) {
      this[propertyName] = null
    }
  }

  _queueCallback (callback, element, isAnimated = true) {
    executeAfterTransition(callback, element, isAnimated)
  }

  _getConfig (config) {
    config = this._mergeConfigObj(config, this._element)
    config = this._configAfterMerge(config)
    this._typeCheckConfig(config)
    return config
  }

  static getInstance (element) {
    return Data.get(getElement(element), this.DATA_KEY)
  }

  static getOrCreateInstance (element, config = {}) {
    return this.getInstance(element) || new this(element, typeof config === 'object' ? config : null)
  }

  static get VERSION () {
    return VERSION
  }

  static get DATA_KEY () {
    return `bs.${this.NAME}`
  }

  static get EVENT_KEY () {
    return `.${this.DATA_KEY}`
  }

  static eventName (name) {
    return `${name}${this.EVENT_KEY}`
  }
}

const enableDismissTrigger = (component, method = 'hide') => {
  const clickEvent = `click.dismiss${component.EVENT_KEY}`
  const name = component.NAME
  EventHandler.on(document, clickEvent, `[data-bs-dismiss="${name}"]`, function (event) {
    if (['A', 'AREA'].includes(this.tagName)) {
      event.preventDefault()
    }
    if (isDisabled(this)) {
      return
    }
    const target = getElementFromSelector(this) || this.closest(`.${name}`)
    const instance = component.getOrCreateInstance(target)
    instance[method]()
  })
}

const NAME$f = 'alert'

const DATA_KEY$a = 'bs.alert'

const EVENT_KEY$b = `.${DATA_KEY$a}`

const EVENT_CLOSE = `close${EVENT_KEY$b}`

const EVENT_CLOSED = `closed${EVENT_KEY$b}`

const CLASS_NAME_FADE$5 = 'fade'

const CLASS_NAME_SHOW$8 = 'show'

class Alert extends BaseComponent {
  static get NAME () {
    return NAME$f
  }

  close () {
    const closeEvent = EventHandler.trigger(this._element, EVENT_CLOSE)
    if (closeEvent.defaultPrevented) {
      return
    }
    this._element.classList.remove(CLASS_NAME_SHOW$8)
    const isAnimated = this._element.classList.contains(CLASS_NAME_FADE$5)
    this._queueCallback(() => this._destroyElement(), this._element, isAnimated)
  }

  _destroyElement () {
    this._element.remove()
    EventHandler.trigger(this._element, EVENT_CLOSED)
    this.dispose()
  }

  static jQueryInterface (config) {
    return this.each(function () {
      const data = Alert.getOrCreateInstance(this)
      if (typeof config !== 'string') {
        return
      }
      if (data[config] === undefined || config.startsWith('_') || config === 'constructor') {
        throw new TypeError(`No method named "${config}"`)
      }
      data[config](this)
    })
  }
}

enableDismissTrigger(Alert, 'close')

defineJQueryPlugin(Alert)

const NAME$e = 'button'

const DATA_KEY$9 = 'bs.button'

const EVENT_KEY$a = `.${DATA_KEY$9}`

const DATA_API_KEY$6 = '.data-api'

const CLASS_NAME_ACTIVE$3 = 'active'

const SELECTOR_DATA_TOGGLE$5 = '[data-bs-toggle="button"]'

const EVENT_CLICK_DATA_API$6 = `click${EVENT_KEY$a}${DATA_API_KEY$6}`

class Button extends BaseComponent {
  static get NAME () {
    return NAME$e
  }

  toggle () {
    this._element.setAttribute('aria-pressed', this._element.classList.toggle(CLASS_NAME_ACTIVE$3))
  }

  static jQueryInterface (config) {
    return this.each(function () {
      const data = Button.getOrCreateInstance(this)
      if (config === 'toggle') {
        data[config]()
      }
    })
  }
}

EventHandler.on(document, EVENT_CLICK_DATA_API$6, SELECTOR_DATA_TOGGLE$5, event => {
  event.preventDefault()
  const button = event.target.closest(SELECTOR_DATA_TOGGLE$5)
  const data = Button.getOrCreateInstance(button)
  data.toggle()
})

defineJQueryPlugin(Button)

const SelectorEngine = {
  find (selector, element = document.documentElement) {
    return [].concat(...Element.prototype.querySelectorAll.call(element, selector))
  },
  findOne (selector, element = document.documentElement) {
    return Element.prototype.querySelector.call(element, selector)
  },
  children (element, selector) {
    return [].concat(...element.children).filter(child => child.matches(selector))
  },
  parents (element, selector) {
    const parents = []
    let ancestor = element.parentNode.closest(selector)
    while (ancestor) {
      parents.push(ancestor)
      ancestor = ancestor.parentNode.closest(selector)
    }
    return parents
  },
  prev (element, selector) {
    let previous = element.previousElementSibling
    while (previous) {
      if (previous.matches(selector)) {
        return [previous]
      }
      previous = previous.previousElementSibling
    }
    return []
  },
  next (element, selector) {
    let next = element.nextElementSibling
    while (next) {
      if (next.matches(selector)) {
        return [next]
      }
      next = next.nextElementSibling
    }
    return []
  },
  focusableChildren (element) {
    const focusables = ['a', 'button', 'input', 'textarea', 'select', 'details', '[tabindex]', '[contenteditable="true"]'].map(selector => `${selector}:not([tabindex^="-"])`).join(',')
    return this.find(focusables, element).filter(el => !isDisabled(el) && isVisible(el))
  }
}

const NAME$d = 'swipe'

const EVENT_KEY$9 = '.bs.swipe'

const EVENT_TOUCHSTART = `touchstart${EVENT_KEY$9}`

const EVENT_TOUCHMOVE = `touchmove${EVENT_KEY$9}`

const EVENT_TOUCHEND = `touchend${EVENT_KEY$9}`

const EVENT_POINTERDOWN = `pointerdown${EVENT_KEY$9}`

const EVENT_POINTERUP = `pointerup${EVENT_KEY$9}`

const POINTER_TYPE_TOUCH = 'touch'

const POINTER_TYPE_PEN = 'pen'

const CLASS_NAME_POINTER_EVENT = 'pointer-event'

const SWIPE_THRESHOLD = 40

const Default$c = {
  endCallback: null,
  leftCallback: null,
  rightCallback: null
}

const DefaultType$c = {
  endCallback: '(function|null)',
  leftCallback: '(function|null)',
  rightCallback: '(function|null)'
}

class Swipe extends Config {
  constructor (element, config) {
    super()
    this._element = element
    if (!element || !Swipe.isSupported()) {
      return
    }
    this._config = this._getConfig(config)
    this._deltaX = 0
    this._supportPointerEvents = Boolean(window.PointerEvent)
    this._initEvents()
  }

  static get Default () {
    return Default$c
  }

  static get DefaultType () {
    return DefaultType$c
  }

  static get NAME () {
    return NAME$d
  }

  dispose () {
    EventHandler.off(this._element, EVENT_KEY$9)
  }

  _start (event) {
    if (!this._supportPointerEvents) {
      this._deltaX = event.touches[0].clientX
      return
    }
    if (this._eventIsPointerPenTouch(event)) {
      this._deltaX = event.clientX
    }
  }

  _end (event) {
    if (this._eventIsPointerPenTouch(event)) {
      this._deltaX = event.clientX - this._deltaX
    }
    this._handleSwipe()
    execute(this._config.endCallback)
  }

  _move (event) {
    this._deltaX = event.touches && event.touches.length > 1 ? 0 : event.touches[0].clientX - this._deltaX
  }

  _handleSwipe () {
    const absDeltaX = Math.abs(this._deltaX)
    if (absDeltaX <= SWIPE_THRESHOLD) {
      return
    }
    const direction = absDeltaX / this._deltaX
    this._deltaX = 0
    if (!direction) {
      return
    }
    execute(direction > 0 ? this._config.rightCallback : this._config.leftCallback)
  }

  _initEvents () {
    if (this._supportPointerEvents) {
      EventHandler.on(this._element, EVENT_POINTERDOWN, event => this._start(event))
      EventHandler.on(this._element, EVENT_POINTERUP, event => this._end(event))
      this._element.classList.add(CLASS_NAME_POINTER_EVENT)
    } else {
      EventHandler.on(this._element, EVENT_TOUCHSTART, event => this._start(event))
      EventHandler.on(this._element, EVENT_TOUCHMOVE, event => this._move(event))
      EventHandler.on(this._element, EVENT_TOUCHEND, event => this._end(event))
    }
  }

  _eventIsPointerPenTouch (event) {
    return this._supportPointerEvents && (event.pointerType === POINTER_TYPE_PEN || event.pointerType === POINTER_TYPE_TOUCH)
  }

  static isSupported () {
    return 'ontouchstart' in document.documentElement || navigator.maxTouchPoints > 0
  }
}

const NAME$c = 'carousel'

const DATA_KEY$8 = 'bs.carousel'

const EVENT_KEY$8 = `.${DATA_KEY$8}`

const DATA_API_KEY$5 = '.data-api'

const ARROW_LEFT_KEY$1 = 'ArrowLeft'

const ARROW_RIGHT_KEY$1 = 'ArrowRight'

const TOUCHEVENT_COMPAT_WAIT = 500

const ORDER_NEXT = 'next'

const ORDER_PREV = 'prev'

const DIRECTION_LEFT = 'left'

const DIRECTION_RIGHT = 'right'

const EVENT_SLIDE = `slide${EVENT_KEY$8}`

const EVENT_SLID = `slid${EVENT_KEY$8}`

const EVENT_KEYDOWN$1 = `keydown${EVENT_KEY$8}`

const EVENT_MOUSEENTER$1 = `mouseenter${EVENT_KEY$8}`

const EVENT_MOUSELEAVE$1 = `mouseleave${EVENT_KEY$8}`

const EVENT_DRAG_START = `dragstart${EVENT_KEY$8}`

const EVENT_LOAD_DATA_API$3 = `load${EVENT_KEY$8}${DATA_API_KEY$5}`

const EVENT_CLICK_DATA_API$5 = `click${EVENT_KEY$8}${DATA_API_KEY$5}`

const CLASS_NAME_CAROUSEL = 'carousel'

const CLASS_NAME_ACTIVE$2 = 'active'

const CLASS_NAME_SLIDE = 'slide'

const CLASS_NAME_END = 'carousel-item-end'

const CLASS_NAME_START = 'carousel-item-start'

const CLASS_NAME_NEXT = 'carousel-item-next'

const CLASS_NAME_PREV = 'carousel-item-prev'

const SELECTOR_ACTIVE = '.active'

const SELECTOR_ITEM = '.carousel-item'

const SELECTOR_ACTIVE_ITEM = SELECTOR_ACTIVE + SELECTOR_ITEM

const SELECTOR_ITEM_IMG = '.carousel-item img'

const SELECTOR_INDICATORS = '.carousel-indicators'

const SELECTOR_DATA_SLIDE = '[data-bs-slide], [data-bs-slide-to]'

const SELECTOR_DATA_RIDE = '[data-bs-ride="carousel"]'

const KEY_TO_DIRECTION = {
  [ARROW_LEFT_KEY$1]: DIRECTION_RIGHT,
  [ARROW_RIGHT_KEY$1]: DIRECTION_LEFT
}

const Default$b = {
  interval: 5e3,
  keyboard: true,
  pause: 'hover',
  ride: false,
  touch: true,
  wrap: true
}

const DefaultType$b = {
  interval: '(number|boolean)',
  keyboard: 'boolean',
  pause: '(string|boolean)',
  ride: '(boolean|string)',
  touch: 'boolean',
  wrap: 'boolean'
}

class Carousel extends BaseComponent {
  constructor (element, config) {
    super(element, config)
    this._interval = null
    this._activeElement = null
    this._isSliding = false
    this.touchTimeout = null
    this._swipeHelper = null
    this._indicatorsElement = SelectorEngine.findOne(SELECTOR_INDICATORS, this._element)
    this._addEventListeners()
    if (this._config.ride === CLASS_NAME_CAROUSEL) {
      this.cycle()
    }
  }

  static get Default () {
    return Default$b
  }

  static get DefaultType () {
    return DefaultType$b
  }

  static get NAME () {
    return NAME$c
  }

  next () {
    this._slide(ORDER_NEXT)
  }

  nextWhenVisible () {
    if (!document.hidden && isVisible(this._element)) {
      this.next()
    }
  }

  prev () {
    this._slide(ORDER_PREV)
  }

  pause () {
    if (this._isSliding) {
      triggerTransitionEnd(this._element)
    }
    this._clearInterval()
  }

  cycle () {
    this._clearInterval()
    this._updateInterval()
    this._interval = setInterval(() => this.nextWhenVisible(), this._config.interval)
  }

  _maybeEnableCycle () {
    if (!this._config.ride) {
      return
    }
    if (this._isSliding) {
      EventHandler.one(this._element, EVENT_SLID, () => this.cycle())
      return
    }
    this.cycle()
  }

  to (index) {
    const items = this._getItems()
    if (index > items.length - 1 || index < 0) {
      return
    }
    if (this._isSliding) {
      EventHandler.one(this._element, EVENT_SLID, () => this.to(index))
      return
    }
    const activeIndex = this._getItemIndex(this._getActive())
    if (activeIndex === index) {
      return
    }
    const order = index > activeIndex ? ORDER_NEXT : ORDER_PREV
    this._slide(order, items[index])
  }

  dispose () {
    if (this._swipeHelper) {
      this._swipeHelper.dispose()
    }
    super.dispose()
  }

  _configAfterMerge (config) {
    config.defaultInterval = config.interval
    return config
  }

  _addEventListeners () {
    if (this._config.keyboard) {
      EventHandler.on(this._element, EVENT_KEYDOWN$1, event => this._keydown(event))
    }
    if (this._config.pause === 'hover') {
      EventHandler.on(this._element, EVENT_MOUSEENTER$1, () => this.pause())
      EventHandler.on(this._element, EVENT_MOUSELEAVE$1, () => this._maybeEnableCycle())
    }
    if (this._config.touch && Swipe.isSupported()) {
      this._addTouchEventListeners()
    }
  }

  _addTouchEventListeners () {
    for (const img of SelectorEngine.find(SELECTOR_ITEM_IMG, this._element)) {
      EventHandler.on(img, EVENT_DRAG_START, event => event.preventDefault())
    }
    const endCallBack = () => {
      if (this._config.pause !== 'hover') {
        return
      }
      this.pause()
      if (this.touchTimeout) {
        clearTimeout(this.touchTimeout)
      }
      this.touchTimeout = setTimeout(() => this._maybeEnableCycle(), TOUCHEVENT_COMPAT_WAIT + this._config.interval)
    }
    const swipeConfig = {
      leftCallback: () => this._slide(this._directionToOrder(DIRECTION_LEFT)),
      rightCallback: () => this._slide(this._directionToOrder(DIRECTION_RIGHT)),
      endCallback: endCallBack
    }
    this._swipeHelper = new Swipe(this._element, swipeConfig)
  }

  _keydown (event) {
    if (/input|textarea/i.test(event.target.tagName)) {
      return
    }
    const direction = KEY_TO_DIRECTION[event.key]
    if (direction) {
      event.preventDefault()
      this._slide(this._directionToOrder(direction))
    }
  }

  _getItemIndex (element) {
    return this._getItems().indexOf(element)
  }

  _setActiveIndicatorElement (index) {
    if (!this._indicatorsElement) {
      return
    }
    const activeIndicator = SelectorEngine.findOne(SELECTOR_ACTIVE, this._indicatorsElement)
    activeIndicator.classList.remove(CLASS_NAME_ACTIVE$2)
    activeIndicator.removeAttribute('aria-current')
    const newActiveIndicator = SelectorEngine.findOne(`[data-bs-slide-to="${index}"]`, this._indicatorsElement)
    if (newActiveIndicator) {
      newActiveIndicator.classList.add(CLASS_NAME_ACTIVE$2)
      newActiveIndicator.setAttribute('aria-current', 'true')
    }
  }

  _updateInterval () {
    const element = this._activeElement || this._getActive()
    if (!element) {
      return
    }
    const elementInterval = Number.parseInt(element.getAttribute('data-bs-interval'), 10)
    this._config.interval = elementInterval || this._config.defaultInterval
  }

  _slide (order, element = null) {
    if (this._isSliding) {
      return
    }
    const activeElement = this._getActive()
    const isNext = order === ORDER_NEXT
    const nextElement = element || getNextActiveElement(this._getItems(), activeElement, isNext, this._config.wrap)
    if (nextElement === activeElement) {
      return
    }
    const nextElementIndex = this._getItemIndex(nextElement)
    const triggerEvent = eventName => EventHandler.trigger(this._element, eventName, {
      relatedTarget: nextElement,
      direction: this._orderToDirection(order),
      from: this._getItemIndex(activeElement),
      to: nextElementIndex
    })
    const slideEvent = triggerEvent(EVENT_SLIDE)
    if (slideEvent.defaultPrevented) {
      return
    }
    if (!activeElement || !nextElement) {
      return
    }
    const isCycling = Boolean(this._interval)
    this.pause()
    this._isSliding = true
    this._setActiveIndicatorElement(nextElementIndex)
    this._activeElement = nextElement
    const directionalClassName = isNext ? CLASS_NAME_START : CLASS_NAME_END
    const orderClassName = isNext ? CLASS_NAME_NEXT : CLASS_NAME_PREV
    nextElement.classList.add(orderClassName)
    reflow(nextElement)
    activeElement.classList.add(directionalClassName)
    nextElement.classList.add(directionalClassName)
    const completeCallBack = () => {
      nextElement.classList.remove(directionalClassName, orderClassName)
      nextElement.classList.add(CLASS_NAME_ACTIVE$2)
      activeElement.classList.remove(CLASS_NAME_ACTIVE$2, orderClassName, directionalClassName)
      this._isSliding = false
      triggerEvent(EVENT_SLID)
    }
    this._queueCallback(completeCallBack, activeElement, this._isAnimated())
    if (isCycling) {
      this.cycle()
    }
  }

  _isAnimated () {
    return this._element.classList.contains(CLASS_NAME_SLIDE)
  }

  _getActive () {
    return SelectorEngine.findOne(SELECTOR_ACTIVE_ITEM, this._element)
  }

  _getItems () {
    return SelectorEngine.find(SELECTOR_ITEM, this._element)
  }

  _clearInterval () {
    if (this._interval) {
      clearInterval(this._interval)
      this._interval = null
    }
  }

  _directionToOrder (direction) {
    if (isRTL()) {
      return direction === DIRECTION_LEFT ? ORDER_PREV : ORDER_NEXT
    }
    return direction === DIRECTION_LEFT ? ORDER_NEXT : ORDER_PREV
  }

  _orderToDirection (order) {
    if (isRTL()) {
      return order === ORDER_PREV ? DIRECTION_LEFT : DIRECTION_RIGHT
    }
    return order === ORDER_PREV ? DIRECTION_RIGHT : DIRECTION_LEFT
  }

  static jQueryInterface (config) {
    return this.each(function () {
      const data = Carousel.getOrCreateInstance(this, config)
      if (typeof config === 'number') {
        data.to(config)
        return
      }
      if (typeof config === 'string') {
        if (data[config] === undefined || config.startsWith('_') || config === 'constructor') {
          throw new TypeError(`No method named "${config}"`)
        }
        data[config]()
      }
    })
  }
}

EventHandler.on(document, EVENT_CLICK_DATA_API$5, SELECTOR_DATA_SLIDE, function (event) {
  const target = getElementFromSelector(this)
  if (!target || !target.classList.contains(CLASS_NAME_CAROUSEL)) {
    return
  }
  event.preventDefault()
  const carousel = Carousel.getOrCreateInstance(target)
  const slideIndex = this.getAttribute('data-bs-slide-to')
  if (slideIndex) {
    carousel.to(slideIndex)
    carousel._maybeEnableCycle()
    return
  }
  if (Manipulator.getDataAttribute(this, 'slide') === 'next') {
    carousel.next()
    carousel._maybeEnableCycle()
    return
  }
  carousel.prev()
  carousel._maybeEnableCycle()
})

EventHandler.on(window, EVENT_LOAD_DATA_API$3, () => {
  const carousels = SelectorEngine.find(SELECTOR_DATA_RIDE)
  for (const carousel of carousels) {
    Carousel.getOrCreateInstance(carousel)
  }
})

defineJQueryPlugin(Carousel)

const NAME$b = 'collapse'

const DATA_KEY$7 = 'bs.collapse'

const EVENT_KEY$7 = `.${DATA_KEY$7}`

const DATA_API_KEY$4 = '.data-api'

const EVENT_SHOW$6 = `show${EVENT_KEY$7}`

const EVENT_SHOWN$6 = `shown${EVENT_KEY$7}`

const EVENT_HIDE$6 = `hide${EVENT_KEY$7}`

const EVENT_HIDDEN$6 = `hidden${EVENT_KEY$7}`

const EVENT_CLICK_DATA_API$4 = `click${EVENT_KEY$7}${DATA_API_KEY$4}`

const CLASS_NAME_SHOW$7 = 'show'

const CLASS_NAME_COLLAPSE = 'collapse'

const CLASS_NAME_COLLAPSING = 'collapsing'

const CLASS_NAME_COLLAPSED = 'collapsed'

const CLASS_NAME_DEEPER_CHILDREN = `:scope .${CLASS_NAME_COLLAPSE} .${CLASS_NAME_COLLAPSE}`

const CLASS_NAME_HORIZONTAL = 'collapse-horizontal'

const WIDTH = 'width'

const HEIGHT = 'height'

const SELECTOR_ACTIVES = '.collapse.show, .collapse.collapsing'

const SELECTOR_DATA_TOGGLE$4 = '[data-bs-toggle="collapse"]'

const Default$a = {
  parent: null,
  toggle: true
}

const DefaultType$a = {
  parent: '(null|element)',
  toggle: 'boolean'
}

class Collapse extends BaseComponent {
  constructor (element, config) {
    super(element, config)
    this._isTransitioning = false
    this._triggerArray = []
    const toggleList = SelectorEngine.find(SELECTOR_DATA_TOGGLE$4)
    for (const elem of toggleList) {
      const selector = getSelectorFromElement(elem)
      const filterElement = SelectorEngine.find(selector).filter(foundElement => foundElement === this._element)
      if (selector !== null && filterElement.length) {
        this._triggerArray.push(elem)
      }
    }
    this._initializeChildren()
    if (!this._config.parent) {
      this._addAriaAndCollapsedClass(this._triggerArray, this._isShown())
    }
    if (this._config.toggle) {
      this.toggle()
    }
  }

  static get Default () {
    return Default$a
  }

  static get DefaultType () {
    return DefaultType$a
  }

  static get NAME () {
    return NAME$b
  }

  toggle () {
    if (this._isShown()) {
      this.hide()
    } else {
      this.show()
    }
  }

  show () {
    if (this._isTransitioning || this._isShown()) {
      return
    }
    let activeChildren = []
    if (this._config.parent) {
      activeChildren = this._getFirstLevelChildren(SELECTOR_ACTIVES).filter(element => element !== this._element).map(element => Collapse.getOrCreateInstance(element, {
        toggle: false
      }))
    }
    if (activeChildren.length && activeChildren[0]._isTransitioning) {
      return
    }
    const startEvent = EventHandler.trigger(this._element, EVENT_SHOW$6)
    if (startEvent.defaultPrevented) {
      return
    }
    for (const activeInstance of activeChildren) {
      activeInstance.hide()
    }
    const dimension = this._getDimension()
    this._element.classList.remove(CLASS_NAME_COLLAPSE)
    this._element.classList.add(CLASS_NAME_COLLAPSING)
    this._element.style[dimension] = 0
    this._addAriaAndCollapsedClass(this._triggerArray, true)
    this._isTransitioning = true
    const complete = () => {
      this._isTransitioning = false
      this._element.classList.remove(CLASS_NAME_COLLAPSING)
      this._element.classList.add(CLASS_NAME_COLLAPSE, CLASS_NAME_SHOW$7)
      this._element.style[dimension] = ''
      EventHandler.trigger(this._element, EVENT_SHOWN$6)
    }
    const capitalizedDimension = dimension[0].toUpperCase() + dimension.slice(1)
    const scrollSize = `scroll${capitalizedDimension}`
    this._queueCallback(complete, this._element, true)
    this._element.style[dimension] = `${this._element[scrollSize]}px`
  }

  hide () {
    if (this._isTransitioning || !this._isShown()) {
      return
    }
    const startEvent = EventHandler.trigger(this._element, EVENT_HIDE$6)
    if (startEvent.defaultPrevented) {
      return
    }
    const dimension = this._getDimension()
    this._element.style[dimension] = `${this._element.getBoundingClientRect()[dimension]}px`
    reflow(this._element)
    this._element.classList.add(CLASS_NAME_COLLAPSING)
    this._element.classList.remove(CLASS_NAME_COLLAPSE, CLASS_NAME_SHOW$7)
    for (const trigger of this._triggerArray) {
      const element = getElementFromSelector(trigger)
      if (element && !this._isShown(element)) {
        this._addAriaAndCollapsedClass([trigger], false)
      }
    }
    this._isTransitioning = true
    const complete = () => {
      this._isTransitioning = false
      this._element.classList.remove(CLASS_NAME_COLLAPSING)
      this._element.classList.add(CLASS_NAME_COLLAPSE)
      EventHandler.trigger(this._element, EVENT_HIDDEN$6)
    }
    this._element.style[dimension] = ''
    this._queueCallback(complete, this._element, true)
  }

  _isShown (element = this._element) {
    return element.classList.contains(CLASS_NAME_SHOW$7)
  }

  _configAfterMerge (config) {
    config.toggle = Boolean(config.toggle)
    config.parent = getElement(config.parent)
    return config
  }

  _getDimension () {
    return this._element.classList.contains(CLASS_NAME_HORIZONTAL) ? WIDTH : HEIGHT
  }

  _initializeChildren () {
    if (!this._config.parent) {
      return
    }
    const children = this._getFirstLevelChildren(SELECTOR_DATA_TOGGLE$4)
    for (const element of children) {
      const selected = getElementFromSelector(element)
      if (selected) {
        this._addAriaAndCollapsedClass([element], this._isShown(selected))
      }
    }
  }

  _getFirstLevelChildren (selector) {
    const children = SelectorEngine.find(CLASS_NAME_DEEPER_CHILDREN, this._config.parent)
    return SelectorEngine.find(selector, this._config.parent).filter(element => !children.includes(element))
  }

  _addAriaAndCollapsedClass (triggerArray, isOpen) {
    if (!triggerArray.length) {
      return
    }
    for (const element of triggerArray) {
      element.classList.toggle(CLASS_NAME_COLLAPSED, !isOpen)
      element.setAttribute('aria-expanded', isOpen)
    }
  }

  static jQueryInterface (config) {
    const _config = {}
    if (typeof config === 'string' && /show|hide/.test(config)) {
      _config.toggle = false
    }
    return this.each(function () {
      const data = Collapse.getOrCreateInstance(this, _config)
      if (typeof config === 'string') {
        if (typeof data[config] === 'undefined') {
          throw new TypeError(`No method named "${config}"`)
        }
        data[config]()
      }
    })
  }
}

EventHandler.on(document, EVENT_CLICK_DATA_API$4, SELECTOR_DATA_TOGGLE$4, function (event) {
  if (event.target.tagName === 'A' || event.delegateTarget && event.delegateTarget.tagName === 'A') {
    event.preventDefault()
  }
  const selector = getSelectorFromElement(this)
  const selectorElements = SelectorEngine.find(selector)
  for (const element of selectorElements) {
    Collapse.getOrCreateInstance(element, {
      toggle: false
    }).toggle()
  }
})

defineJQueryPlugin(Collapse)

const NAME$a = 'dropdown'

const DATA_KEY$6 = 'bs.dropdown'

const EVENT_KEY$6 = `.${DATA_KEY$6}`

const DATA_API_KEY$3 = '.data-api'

const ESCAPE_KEY$2 = 'Escape'

const TAB_KEY$1 = 'Tab'

const ARROW_UP_KEY$1 = 'ArrowUp'

const ARROW_DOWN_KEY$1 = 'ArrowDown'

const RIGHT_MOUSE_BUTTON = 2

const EVENT_HIDE$5 = `hide${EVENT_KEY$6}`

const EVENT_HIDDEN$5 = `hidden${EVENT_KEY$6}`

const EVENT_SHOW$5 = `show${EVENT_KEY$6}`

const EVENT_SHOWN$5 = `shown${EVENT_KEY$6}`

const EVENT_CLICK_DATA_API$3 = `click${EVENT_KEY$6}${DATA_API_KEY$3}`

const EVENT_KEYDOWN_DATA_API = `keydown${EVENT_KEY$6}${DATA_API_KEY$3}`

const EVENT_KEYUP_DATA_API = `keyup${EVENT_KEY$6}${DATA_API_KEY$3}`

const CLASS_NAME_SHOW$6 = 'show'

const CLASS_NAME_DROPUP = 'dropup'

const CLASS_NAME_DROPEND = 'dropend'

const CLASS_NAME_DROPSTART = 'dropstart'

const CLASS_NAME_DROPUP_CENTER = 'dropup-center'

const CLASS_NAME_DROPDOWN_CENTER = 'dropdown-center'

const SELECTOR_DATA_TOGGLE$3 = '[data-bs-toggle="dropdown"]:not(.disabled):not(:disabled)'

const SELECTOR_DATA_TOGGLE_SHOWN = `${SELECTOR_DATA_TOGGLE$3}.${CLASS_NAME_SHOW$6}`

const SELECTOR_MENU = '.dropdown-menu'

const SELECTOR_NAVBAR = '.navbar'

const SELECTOR_NAVBAR_NAV = '.navbar-nav'

const SELECTOR_VISIBLE_ITEMS = '.dropdown-menu .dropdown-item:not(.disabled):not(:disabled)'

const PLACEMENT_TOP = isRTL() ? 'top-end' : 'top-start'

const PLACEMENT_TOPEND = isRTL() ? 'top-start' : 'top-end'

const PLACEMENT_BOTTOM = isRTL() ? 'bottom-end' : 'bottom-start'

const PLACEMENT_BOTTOMEND = isRTL() ? 'bottom-start' : 'bottom-end'

const PLACEMENT_RIGHT = isRTL() ? 'left-start' : 'right-start'

const PLACEMENT_LEFT = isRTL() ? 'right-start' : 'left-start'

const PLACEMENT_TOPCENTER = 'top'

const PLACEMENT_BOTTOMCENTER = 'bottom'

const Default$9 = {
  autoClose: true,
  boundary: 'clippingParents',
  display: 'dynamic',
  offset: [0, 2],
  popperConfig: null,
  reference: 'toggle'
}

const DefaultType$9 = {
  autoClose: '(boolean|string)',
  boundary: '(string|element)',
  display: 'string',
  offset: '(array|string|function)',
  popperConfig: '(null|object|function)',
  reference: '(string|element|object)'
}

class Dropdown extends BaseComponent {
  constructor (element, config) {
    super(element, config)
    this._popper = null
    this._parent = this._element.parentNode
    this._menu = SelectorEngine.next(this._element, SELECTOR_MENU)[0] || SelectorEngine.prev(this._element, SELECTOR_MENU)[0] || SelectorEngine.findOne(SELECTOR_MENU, this._parent)
    this._inNavbar = this._detectNavbar()
  }

  static get Default () {
    return Default$9
  }

  static get DefaultType () {
    return DefaultType$9
  }

  static get NAME () {
    return NAME$a
  }

  toggle () {
    return this._isShown() ? this.hide() : this.show()
  }

  show () {
    if (isDisabled(this._element) || this._isShown()) {
      return
    }
    const relatedTarget = {
      relatedTarget: this._element
    }
    const showEvent = EventHandler.trigger(this._element, EVENT_SHOW$5, relatedTarget)
    if (showEvent.defaultPrevented) {
      return
    }
    this._createPopper()
    if ('ontouchstart' in document.documentElement && !this._parent.closest(SELECTOR_NAVBAR_NAV)) {
      for (const element of [].concat(...document.body.children)) {
        EventHandler.on(element, 'mouseover', noop)
      }
    }
    this._element.focus()
    this._element.setAttribute('aria-expanded', true)
    this._menu.classList.add(CLASS_NAME_SHOW$6)
    this._element.classList.add(CLASS_NAME_SHOW$6)
    EventHandler.trigger(this._element, EVENT_SHOWN$5, relatedTarget)
  }

  hide () {
    if (isDisabled(this._element) || !this._isShown()) {
      return
    }
    const relatedTarget = {
      relatedTarget: this._element
    }
    this._completeHide(relatedTarget)
  }

  dispose () {
    if (this._popper) {
      this._popper.destroy()
    }
    super.dispose()
  }

  update () {
    this._inNavbar = this._detectNavbar()
    if (this._popper) {
      this._popper.update()
    }
  }

  _completeHide (relatedTarget) {
    const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE$5, relatedTarget)
    if (hideEvent.defaultPrevented) {
      return
    }
    if ('ontouchstart' in document.documentElement) {
      for (const element of [].concat(...document.body.children)) {
        EventHandler.off(element, 'mouseover', noop)
      }
    }
    if (this._popper) {
      this._popper.destroy()
    }
    this._menu.classList.remove(CLASS_NAME_SHOW$6)
    this._element.classList.remove(CLASS_NAME_SHOW$6)
    this._element.setAttribute('aria-expanded', 'false')
    Manipulator.removeDataAttribute(this._menu, 'popper')
    EventHandler.trigger(this._element, EVENT_HIDDEN$5, relatedTarget)
  }

  _getConfig (config) {
    config = super._getConfig(config)
    if (typeof config.reference === 'object' && !isElement(config.reference) && typeof config.reference.getBoundingClientRect !== 'function') {
      throw new TypeError(`${NAME$a.toUpperCase()}: Option "reference" provided type "object" without a required "getBoundingClientRect" method.`)
    }
    return config
  }

  _createPopper () {
    if (typeof Popper === 'undefined') {
      throw new TypeError("Bootstrap's dropdowns require Popper (https://popper.js.org)")
    }
    let referenceElement = this._element
    if (this._config.reference === 'parent') {
      referenceElement = this._parent
    } else if (isElement(this._config.reference)) {
      referenceElement = getElement(this._config.reference)
    } else if (typeof this._config.reference === 'object') {
      referenceElement = this._config.reference
    }
    const popperConfig = this._getPopperConfig()
    this._popper = createPopper(referenceElement, this._menu, popperConfig)
  }

  _isShown () {
    return this._menu.classList.contains(CLASS_NAME_SHOW$6)
  }

  _getPlacement () {
    const parentDropdown = this._parent
    if (parentDropdown.classList.contains(CLASS_NAME_DROPEND)) {
      return PLACEMENT_RIGHT
    }
    if (parentDropdown.classList.contains(CLASS_NAME_DROPSTART)) {
      return PLACEMENT_LEFT
    }
    if (parentDropdown.classList.contains(CLASS_NAME_DROPUP_CENTER)) {
      return PLACEMENT_TOPCENTER
    }
    if (parentDropdown.classList.contains(CLASS_NAME_DROPDOWN_CENTER)) {
      return PLACEMENT_BOTTOMCENTER
    }
    const isEnd = getComputedStyle(this._menu).getPropertyValue('--bs-position').trim() === 'end'
    if (parentDropdown.classList.contains(CLASS_NAME_DROPUP)) {
      return isEnd ? PLACEMENT_TOPEND : PLACEMENT_TOP
    }
    return isEnd ? PLACEMENT_BOTTOMEND : PLACEMENT_BOTTOM
  }

  _detectNavbar () {
    return this._element.closest(SELECTOR_NAVBAR) !== null
  }

  _getOffset () {
    const { offset } = this._config
    if (typeof offset === 'string') {
      return offset.split(',').map(value => Number.parseInt(value, 10))
    }
    if (typeof offset === 'function') {
      return popperData => offset(popperData, this._element)
    }
    return offset
  }

  _getPopperConfig () {
    const defaultBsPopperConfig = {
      placement: this._getPlacement(),
      modifiers: [{
        name: 'preventOverflow',
        options: {
          boundary: this._config.boundary
        }
      }, {
        name: 'offset',
        options: {
          offset: this._getOffset()
        }
      }]
    }
    if (this._inNavbar || this._config.display === 'static') {
      Manipulator.setDataAttribute(this._menu, 'popper', 'static')
      defaultBsPopperConfig.modifiers = [{
        name: 'applyStyles',
        enabled: false
      }]
    }
    return {
      ...defaultBsPopperConfig,
      ...typeof this._config.popperConfig === 'function' ? this._config.popperConfig(defaultBsPopperConfig) : this._config.popperConfig
    }
  }

  _selectMenuItem ({ key, target }) {
    const items = SelectorEngine.find(SELECTOR_VISIBLE_ITEMS, this._menu).filter(element => isVisible(element))
    if (!items.length) {
      return
    }
    getNextActiveElement(items, target, key === ARROW_DOWN_KEY$1, !items.includes(target)).focus()
  }

  static jQueryInterface (config) {
    return this.each(function () {
      const data = Dropdown.getOrCreateInstance(this, config)
      if (typeof config !== 'string') {
        return
      }
      if (typeof data[config] === 'undefined') {
        throw new TypeError(`No method named "${config}"`)
      }
      data[config]()
    })
  }

  static clearMenus (event) {
    if (event.button === RIGHT_MOUSE_BUTTON || event.type === 'keyup' && event.key !== TAB_KEY$1) {
      return
    }
    const openToggles = SelectorEngine.find(SELECTOR_DATA_TOGGLE_SHOWN)
    for (const toggle of openToggles) {
      const context = Dropdown.getInstance(toggle)
      if (!context || context._config.autoClose === false) {
        continue
      }
      const composedPath = event.composedPath()
      const isMenuTarget = composedPath.includes(context._menu)
      if (composedPath.includes(context._element) || context._config.autoClose === 'inside' && !isMenuTarget || context._config.autoClose === 'outside' && isMenuTarget) {
        continue
      }
      if (context._menu.contains(event.target) && (event.type === 'keyup' && event.key === TAB_KEY$1 || /input|select|option|textarea|form/i.test(event.target.tagName))) {
        continue
      }
      const relatedTarget = {
        relatedTarget: context._element
      }
      if (event.type === 'click') {
        relatedTarget.clickEvent = event
      }
      context._completeHide(relatedTarget)
    }
  }

  static dataApiKeydownHandler (event) {
    const isInput = /input|textarea/i.test(event.target.tagName)
    const isEscapeEvent = event.key === ESCAPE_KEY$2
    const isUpOrDownEvent = [ARROW_UP_KEY$1, ARROW_DOWN_KEY$1].includes(event.key)
    if (!isUpOrDownEvent && !isEscapeEvent) {
      return
    }
    if (isInput && !isEscapeEvent) {
      return
    }
    event.preventDefault()
    const getToggleButton = this.matches(SELECTOR_DATA_TOGGLE$3) ? this : SelectorEngine.prev(this, SELECTOR_DATA_TOGGLE$3)[0] || SelectorEngine.next(this, SELECTOR_DATA_TOGGLE$3)[0] || SelectorEngine.findOne(SELECTOR_DATA_TOGGLE$3, event.delegateTarget.parentNode)
    const instance = Dropdown.getOrCreateInstance(getToggleButton)
    if (isUpOrDownEvent) {
      event.stopPropagation()
      instance.show()
      instance._selectMenuItem(event)
      return
    }
    if (instance._isShown()) {
      event.stopPropagation()
      instance.hide()
      getToggleButton.focus()
    }
  }
}

EventHandler.on(document, EVENT_KEYDOWN_DATA_API, SELECTOR_DATA_TOGGLE$3, Dropdown.dataApiKeydownHandler)

EventHandler.on(document, EVENT_KEYDOWN_DATA_API, SELECTOR_MENU, Dropdown.dataApiKeydownHandler)

EventHandler.on(document, EVENT_CLICK_DATA_API$3, Dropdown.clearMenus)

EventHandler.on(document, EVENT_KEYUP_DATA_API, Dropdown.clearMenus)

EventHandler.on(document, EVENT_CLICK_DATA_API$3, SELECTOR_DATA_TOGGLE$3, function (event) {
  event.preventDefault()
  Dropdown.getOrCreateInstance(this).toggle()
})

defineJQueryPlugin(Dropdown)

const SELECTOR_FIXED_CONTENT = '.fixed-top, .fixed-bottom, .is-fixed, .sticky-top'

const SELECTOR_STICKY_CONTENT = '.sticky-top'

const PROPERTY_PADDING = 'padding-right'

const PROPERTY_MARGIN = 'margin-right'

class ScrollBarHelper {
  constructor () {
    this._element = document.body
  }

  getWidth () {
    const documentWidth = document.documentElement.clientWidth
    return Math.abs(window.innerWidth - documentWidth)
  }

  hide () {
    const width = this.getWidth()
    this._disableOverFlow()
    this._setElementAttributes(this._element, PROPERTY_PADDING, calculatedValue => calculatedValue + width)
    this._setElementAttributes(SELECTOR_FIXED_CONTENT, PROPERTY_PADDING, calculatedValue => calculatedValue + width)
    this._setElementAttributes(SELECTOR_STICKY_CONTENT, PROPERTY_MARGIN, calculatedValue => calculatedValue - width)
  }

  reset () {
    this._resetElementAttributes(this._element, 'overflow')
    this._resetElementAttributes(this._element, PROPERTY_PADDING)
    this._resetElementAttributes(SELECTOR_FIXED_CONTENT, PROPERTY_PADDING)
    this._resetElementAttributes(SELECTOR_STICKY_CONTENT, PROPERTY_MARGIN)
  }

  isOverflowing () {
    return this.getWidth() > 0
  }

  _disableOverFlow () {
    this._saveInitialAttribute(this._element, 'overflow')
    this._element.style.overflow = 'hidden'
  }

  _setElementAttributes (selector, styleProperty, callback) {
    const scrollbarWidth = this.getWidth()
    const manipulationCallBack = element => {
      if (element !== this._element && window.innerWidth > element.clientWidth + scrollbarWidth) {
        return
      }
      this._saveInitialAttribute(element, styleProperty)
      const calculatedValue = window.getComputedStyle(element).getPropertyValue(styleProperty)
      element.style.setProperty(styleProperty, `${callback(Number.parseFloat(calculatedValue))}px`)
    }
    this._applyManipulationCallback(selector, manipulationCallBack)
  }

  _saveInitialAttribute (element, styleProperty) {
    const actualValue = element.style.getPropertyValue(styleProperty)
    if (actualValue) {
      Manipulator.setDataAttribute(element, styleProperty, actualValue)
    }
  }

  _resetElementAttributes (selector, styleProperty) {
    const manipulationCallBack = element => {
      const value = Manipulator.getDataAttribute(element, styleProperty)
      if (value === null) {
        element.style.removeProperty(styleProperty)
        return
      }
      Manipulator.removeDataAttribute(element, styleProperty)
      element.style.setProperty(styleProperty, value)
    }
    this._applyManipulationCallback(selector, manipulationCallBack)
  }

  _applyManipulationCallback (selector, callBack) {
    if (isElement(selector)) {
      callBack(selector)
      return
    }
    for (const sel of SelectorEngine.find(selector, this._element)) {
      callBack(sel)
    }
  }
}

const NAME$9 = 'backdrop'

const CLASS_NAME_FADE$4 = 'fade'

const CLASS_NAME_SHOW$5 = 'show'

const EVENT_MOUSEDOWN = `mousedown.bs.${NAME$9}`

const Default$8 = {
  className: 'modal-backdrop',
  clickCallback: null,
  isAnimated: false,
  isVisible: true,
  rootElement: 'body'
}

const DefaultType$8 = {
  className: 'string',
  clickCallback: '(function|null)',
  isAnimated: 'boolean',
  isVisible: 'boolean',
  rootElement: '(element|string)'
}

class Backdrop extends Config {
  constructor (config) {
    super()
    this._config = this._getConfig(config)
    this._isAppended = false
    this._element = null
  }

  static get Default () {
    return Default$8
  }

  static get DefaultType () {
    return DefaultType$8
  }

  static get NAME () {
    return NAME$9
  }

  show (callback) {
    if (!this._config.isVisible) {
      execute(callback)
      return
    }
    this._append()
    const element = this._getElement()
    if (this._config.isAnimated) {
      reflow(element)
    }
    element.classList.add(CLASS_NAME_SHOW$5)
    this._emulateAnimation(() => {
      execute(callback)
    })
  }

  hide (callback) {
    if (!this._config.isVisible) {
      execute(callback)
      return
    }
    this._getElement().classList.remove(CLASS_NAME_SHOW$5)
    this._emulateAnimation(() => {
      this.dispose()
      execute(callback)
    })
  }

  dispose () {
    if (!this._isAppended) {
      return
    }
    EventHandler.off(this._element, EVENT_MOUSEDOWN)
    this._element.remove()
    this._isAppended = false
  }

  _getElement () {
    if (!this._element) {
      const backdrop = document.createElement('div')
      backdrop.className = this._config.className
      if (this._config.isAnimated) {
        backdrop.classList.add(CLASS_NAME_FADE$4)
      }
      this._element = backdrop
    }
    return this._element
  }

  _configAfterMerge (config) {
    config.rootElement = getElement(config.rootElement)
    return config
  }

  _append () {
    if (this._isAppended) {
      return
    }
    const element = this._getElement()
    this._config.rootElement.append(element)
    EventHandler.on(element, EVENT_MOUSEDOWN, () => {
      execute(this._config.clickCallback)
    })
    this._isAppended = true
  }

  _emulateAnimation (callback) {
    executeAfterTransition(callback, this._getElement(), this._config.isAnimated)
  }
}

const NAME$8 = 'focustrap'

const DATA_KEY$5 = 'bs.focustrap'

const EVENT_KEY$5 = `.${DATA_KEY$5}`

const EVENT_FOCUSIN$2 = `focusin${EVENT_KEY$5}`

const EVENT_KEYDOWN_TAB = `keydown.tab${EVENT_KEY$5}`

const TAB_KEY = 'Tab'

const TAB_NAV_FORWARD = 'forward'

const TAB_NAV_BACKWARD = 'backward'

const Default$7 = {
  autofocus: true,
  trapElement: null
}

const DefaultType$7 = {
  autofocus: 'boolean',
  trapElement: 'element'
}

class FocusTrap extends Config {
  constructor (config) {
    super()
    this._config = this._getConfig(config)
    this._isActive = false
    this._lastTabNavDirection = null
  }

  static get Default () {
    return Default$7
  }

  static get DefaultType () {
    return DefaultType$7
  }

  static get NAME () {
    return NAME$8
  }

  activate () {
    if (this._isActive) {
      return
    }
    if (this._config.autofocus) {
      this._config.trapElement.focus()
    }
    EventHandler.off(document, EVENT_KEY$5)
    EventHandler.on(document, EVENT_FOCUSIN$2, event => this._handleFocusin(event))
    EventHandler.on(document, EVENT_KEYDOWN_TAB, event => this._handleKeydown(event))
    this._isActive = true
  }

  deactivate () {
    if (!this._isActive) {
      return
    }
    this._isActive = false
    EventHandler.off(document, EVENT_KEY$5)
  }

  _handleFocusin (event) {
    const { trapElement } = this._config
    if (event.target === document || event.target === trapElement || trapElement.contains(event.target)) {
      return
    }
    const elements = SelectorEngine.focusableChildren(trapElement)
    if (elements.length === 0) {
      trapElement.focus()
    } else if (this._lastTabNavDirection === TAB_NAV_BACKWARD) {
      elements[elements.length - 1].focus()
    } else {
      elements[0].focus()
    }
  }

  _handleKeydown (event) {
    if (event.key !== TAB_KEY) {
      return
    }
    this._lastTabNavDirection = event.shiftKey ? TAB_NAV_BACKWARD : TAB_NAV_FORWARD
  }
}

const NAME$7 = 'modal'

const DATA_KEY$4 = 'bs.modal'

const EVENT_KEY$4 = `.${DATA_KEY$4}`

const DATA_API_KEY$2 = '.data-api'

const ESCAPE_KEY$1 = 'Escape'

const EVENT_HIDE$4 = `hide${EVENT_KEY$4}`

const EVENT_HIDE_PREVENTED$1 = `hidePrevented${EVENT_KEY$4}`

const EVENT_HIDDEN$4 = `hidden${EVENT_KEY$4}`

const EVENT_SHOW$4 = `show${EVENT_KEY$4}`

const EVENT_SHOWN$4 = `shown${EVENT_KEY$4}`

const EVENT_RESIZE$1 = `resize${EVENT_KEY$4}`

const EVENT_CLICK_DISMISS = `click.dismiss${EVENT_KEY$4}`

const EVENT_MOUSEDOWN_DISMISS = `mousedown.dismiss${EVENT_KEY$4}`

const EVENT_KEYDOWN_DISMISS$1 = `keydown.dismiss${EVENT_KEY$4}`

const EVENT_CLICK_DATA_API$2 = `click${EVENT_KEY$4}${DATA_API_KEY$2}`

const CLASS_NAME_OPEN = 'modal-open'

const CLASS_NAME_FADE$3 = 'fade'

const CLASS_NAME_SHOW$4 = 'show'

const CLASS_NAME_STATIC = 'modal-static'

const OPEN_SELECTOR$1 = '.modal.show'

const SELECTOR_DIALOG = '.modal-dialog'

const SELECTOR_MODAL_BODY = '.modal-body'

const SELECTOR_DATA_TOGGLE$2 = '[data-bs-toggle="modal"]'

const Default$6 = {
  backdrop: true,
  focus: true,
  keyboard: true
}

const DefaultType$6 = {
  backdrop: '(boolean|string)',
  focus: 'boolean',
  keyboard: 'boolean'
}

class Modal extends BaseComponent {
  constructor (element, config) {
    super(element, config)
    this._dialog = SelectorEngine.findOne(SELECTOR_DIALOG, this._element)
    this._backdrop = this._initializeBackDrop()
    this._focustrap = this._initializeFocusTrap()
    this._isShown = false
    this._isTransitioning = false
    this._scrollBar = new ScrollBarHelper()
    this._addEventListeners()
  }

  static get Default () {
    return Default$6
  }

  static get DefaultType () {
    return DefaultType$6
  }

  static get NAME () {
    return NAME$7
  }

  toggle (relatedTarget) {
    return this._isShown ? this.hide() : this.show(relatedTarget)
  }

  show (relatedTarget) {
    if (this._isShown || this._isTransitioning) {
      return
    }
    const showEvent = EventHandler.trigger(this._element, EVENT_SHOW$4, {
      relatedTarget
    })
    if (showEvent.defaultPrevented) {
      return
    }
    this._isShown = true
    this._isTransitioning = true
    this._scrollBar.hide()
    document.body.classList.add(CLASS_NAME_OPEN)
    this._adjustDialog()
    this._backdrop.show(() => this._showElement(relatedTarget))
  }

  hide () {
    if (!this._isShown || this._isTransitioning) {
      return
    }
    const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE$4)
    if (hideEvent.defaultPrevented) {
      return
    }
    this._isShown = false
    this._isTransitioning = true
    this._focustrap.deactivate()
    this._element.classList.remove(CLASS_NAME_SHOW$4)
    this._queueCallback(() => this._hideModal(), this._element, this._isAnimated())
  }

  dispose () {
    for (const htmlElement of [window, this._dialog]) {
      EventHandler.off(htmlElement, EVENT_KEY$4)
    }
    this._backdrop.dispose()
    this._focustrap.deactivate()
    super.dispose()
  }

  handleUpdate () {
    this._adjustDialog()
  }

  _initializeBackDrop () {
    return new Backdrop({
      isVisible: Boolean(this._config.backdrop),
      isAnimated: this._isAnimated()
    })
  }

  _initializeFocusTrap () {
    return new FocusTrap({
      trapElement: this._element
    })
  }

  _showElement (relatedTarget) {
    if (!document.body.contains(this._element)) {
      document.body.append(this._element)
    }
    this._element.style.display = 'block'
    this._element.removeAttribute('aria-hidden')
    this._element.setAttribute('aria-modal', true)
    this._element.setAttribute('role', 'dialog')
    this._element.scrollTop = 0
    const modalBody = SelectorEngine.findOne(SELECTOR_MODAL_BODY, this._dialog)
    if (modalBody) {
      modalBody.scrollTop = 0
    }
    reflow(this._element)
    this._element.classList.add(CLASS_NAME_SHOW$4)
    const transitionComplete = () => {
      if (this._config.focus) {
        this._focustrap.activate()
      }
      this._isTransitioning = false
      EventHandler.trigger(this._element, EVENT_SHOWN$4, {
        relatedTarget
      })
    }
    this._queueCallback(transitionComplete, this._dialog, this._isAnimated())
  }

  _addEventListeners () {
    EventHandler.on(this._element, EVENT_KEYDOWN_DISMISS$1, event => {
      if (event.key !== ESCAPE_KEY$1) {
        return
      }
      if (this._config.keyboard) {
        event.preventDefault()
        this.hide()
        return
      }
      this._triggerBackdropTransition()
    })
    EventHandler.on(window, EVENT_RESIZE$1, () => {
      if (this._isShown && !this._isTransitioning) {
        this._adjustDialog()
      }
    })
    EventHandler.on(this._element, EVENT_MOUSEDOWN_DISMISS, event => {
      EventHandler.one(this._element, EVENT_CLICK_DISMISS, event2 => {
        if (this._element !== event.target || this._element !== event2.target) {
          return
        }
        if (this._config.backdrop === 'static') {
          this._triggerBackdropTransition()
          return
        }
        if (this._config.backdrop) {
          this.hide()
        }
      })
    })
  }

  _hideModal () {
    this._element.style.display = 'none'
    this._element.setAttribute('aria-hidden', true)
    this._element.removeAttribute('aria-modal')
    this._element.removeAttribute('role')
    this._isTransitioning = false
    this._backdrop.hide(() => {
      document.body.classList.remove(CLASS_NAME_OPEN)
      this._resetAdjustments()
      this._scrollBar.reset()
      EventHandler.trigger(this._element, EVENT_HIDDEN$4)
    })
  }

  _isAnimated () {
    return this._element.classList.contains(CLASS_NAME_FADE$3)
  }

  _triggerBackdropTransition () {
    const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE_PREVENTED$1)
    if (hideEvent.defaultPrevented) {
      return
    }
    const isModalOverflowing = this._element.scrollHeight > document.documentElement.clientHeight
    const initialOverflowY = this._element.style.overflowY
    if (initialOverflowY === 'hidden' || this._element.classList.contains(CLASS_NAME_STATIC)) {
      return
    }
    if (!isModalOverflowing) {
      this._element.style.overflowY = 'hidden'
    }
    this._element.classList.add(CLASS_NAME_STATIC)
    this._queueCallback(() => {
      this._element.classList.remove(CLASS_NAME_STATIC)
      this._queueCallback(() => {
        this._element.style.overflowY = initialOverflowY
      }, this._dialog)
    }, this._dialog)
    this._element.focus()
  }

  _adjustDialog () {
    const isModalOverflowing = this._element.scrollHeight > document.documentElement.clientHeight
    const scrollbarWidth = this._scrollBar.getWidth()
    const isBodyOverflowing = scrollbarWidth > 0
    if (isBodyOverflowing && !isModalOverflowing) {
      const property = isRTL() ? 'paddingLeft' : 'paddingRight'
      this._element.style[property] = `${scrollbarWidth}px`
    }
    if (!isBodyOverflowing && isModalOverflowing) {
      const property = isRTL() ? 'paddingRight' : 'paddingLeft'
      this._element.style[property] = `${scrollbarWidth}px`
    }
  }

  _resetAdjustments () {
    this._element.style.paddingLeft = ''
    this._element.style.paddingRight = ''
  }

  static jQueryInterface (config, relatedTarget) {
    return this.each(function () {
      const data = Modal.getOrCreateInstance(this, config)
      if (typeof config !== 'string') {
        return
      }
      if (typeof data[config] === 'undefined') {
        throw new TypeError(`No method named "${config}"`)
      }
      data[config](relatedTarget)
    })
  }
}

EventHandler.on(document, EVENT_CLICK_DATA_API$2, SELECTOR_DATA_TOGGLE$2, function (event) {
  const target = getElementFromSelector(this)
  if (['A', 'AREA'].includes(this.tagName)) {
    event.preventDefault()
  }
  EventHandler.one(target, EVENT_SHOW$4, showEvent => {
    if (showEvent.defaultPrevented) {
      return
    }
    EventHandler.one(target, EVENT_HIDDEN$4, () => {
      if (isVisible(this)) {
        this.focus()
      }
    })
  })
  const alreadyOpen = SelectorEngine.findOne(OPEN_SELECTOR$1)
  if (alreadyOpen) {
    Modal.getInstance(alreadyOpen).hide()
  }
  const data = Modal.getOrCreateInstance(target)
  data.toggle(this)
})

enableDismissTrigger(Modal)

defineJQueryPlugin(Modal)

const NAME$6 = 'offcanvas'

const DATA_KEY$3 = 'bs.offcanvas'

const EVENT_KEY$3 = `.${DATA_KEY$3}`

const DATA_API_KEY$1 = '.data-api'

const EVENT_LOAD_DATA_API$2 = `load${EVENT_KEY$3}${DATA_API_KEY$1}`

const ESCAPE_KEY = 'Escape'

const CLASS_NAME_SHOW$3 = 'show'

const CLASS_NAME_SHOWING$1 = 'showing'

const CLASS_NAME_HIDING = 'hiding'

const CLASS_NAME_BACKDROP = 'offcanvas-backdrop'

const OPEN_SELECTOR = '.offcanvas.show'

const EVENT_SHOW$3 = `show${EVENT_KEY$3}`

const EVENT_SHOWN$3 = `shown${EVENT_KEY$3}`

const EVENT_HIDE$3 = `hide${EVENT_KEY$3}`

const EVENT_HIDE_PREVENTED = `hidePrevented${EVENT_KEY$3}`

const EVENT_HIDDEN$3 = `hidden${EVENT_KEY$3}`

const EVENT_RESIZE = `resize${EVENT_KEY$3}`

const EVENT_CLICK_DATA_API$1 = `click${EVENT_KEY$3}${DATA_API_KEY$1}`

const EVENT_KEYDOWN_DISMISS = `keydown.dismiss${EVENT_KEY$3}`

const SELECTOR_DATA_TOGGLE$1 = '[data-bs-toggle="offcanvas"]'

const Default$5 = {
  backdrop: true,
  keyboard: true,
  scroll: false
}

const DefaultType$5 = {
  backdrop: '(boolean|string)',
  keyboard: 'boolean',
  scroll: 'boolean'
}

class Offcanvas extends BaseComponent {
  constructor (element, config) {
    super(element, config)
    this._isShown = false
    this._backdrop = this._initializeBackDrop()
    this._focustrap = this._initializeFocusTrap()
    this._addEventListeners()
  }

  static get Default () {
    return Default$5
  }

  static get DefaultType () {
    return DefaultType$5
  }

  static get NAME () {
    return NAME$6
  }

  toggle (relatedTarget) {
    return this._isShown ? this.hide() : this.show(relatedTarget)
  }

  show (relatedTarget) {
    if (this._isShown) {
      return
    }
    const showEvent = EventHandler.trigger(this._element, EVENT_SHOW$3, {
      relatedTarget
    })
    if (showEvent.defaultPrevented) {
      return
    }
    this._isShown = true
    this._backdrop.show()
    if (!this._config.scroll) {
      (new ScrollBarHelper()).hide()
    }
    this._element.setAttribute('aria-modal', true)
    this._element.setAttribute('role', 'dialog')
    this._element.classList.add(CLASS_NAME_SHOWING$1)
    const completeCallBack = () => {
      if (!this._config.scroll || this._config.backdrop) {
        this._focustrap.activate()
      }
      this._element.classList.add(CLASS_NAME_SHOW$3)
      this._element.classList.remove(CLASS_NAME_SHOWING$1)
      EventHandler.trigger(this._element, EVENT_SHOWN$3, {
        relatedTarget
      })
    }
    this._queueCallback(completeCallBack, this._element, true)
  }

  hide () {
    if (!this._isShown) {
      return
    }
    const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE$3)
    if (hideEvent.defaultPrevented) {
      return
    }
    this._focustrap.deactivate()
    this._element.blur()
    this._isShown = false
    this._element.classList.add(CLASS_NAME_HIDING)
    this._backdrop.hide()
    const completeCallback = () => {
      this._element.classList.remove(CLASS_NAME_SHOW$3, CLASS_NAME_HIDING)
      this._element.removeAttribute('aria-modal')
      this._element.removeAttribute('role')
      if (!this._config.scroll) {
        (new ScrollBarHelper()).reset()
      }
      EventHandler.trigger(this._element, EVENT_HIDDEN$3)
    }
    this._queueCallback(completeCallback, this._element, true)
  }

  dispose () {
    this._backdrop.dispose()
    this._focustrap.deactivate()
    super.dispose()
  }

  _initializeBackDrop () {
    const clickCallback = () => {
      if (this._config.backdrop === 'static') {
        EventHandler.trigger(this._element, EVENT_HIDE_PREVENTED)
        return
      }
      this.hide()
    }
    const isVisible = Boolean(this._config.backdrop)
    return new Backdrop({
      className: CLASS_NAME_BACKDROP,
      isVisible,
      isAnimated: true,
      rootElement: this._element.parentNode,
      clickCallback: isVisible ? clickCallback : null
    })
  }

  _initializeFocusTrap () {
    return new FocusTrap({
      trapElement: this._element
    })
  }

  _addEventListeners () {
    EventHandler.on(this._element, EVENT_KEYDOWN_DISMISS, event => {
      if (event.key !== ESCAPE_KEY) {
        return
      }
      if (!this._config.keyboard) {
        EventHandler.trigger(this._element, EVENT_HIDE_PREVENTED)
        return
      }
      this.hide()
    })
  }

  static jQueryInterface (config) {
    return this.each(function () {
      const data = Offcanvas.getOrCreateInstance(this, config)
      if (typeof config !== 'string') {
        return
      }
      if (data[config] === undefined || config.startsWith('_') || config === 'constructor') {
        throw new TypeError(`No method named "${config}"`)
      }
      data[config](this)
    })
  }
}

EventHandler.on(document, EVENT_CLICK_DATA_API$1, SELECTOR_DATA_TOGGLE$1, function (event) {
  const target = getElementFromSelector(this)
  if (['A', 'AREA'].includes(this.tagName)) {
    event.preventDefault()
  }
  if (isDisabled(this)) {
    return
  }
  EventHandler.one(target, EVENT_HIDDEN$3, () => {
    if (isVisible(this)) {
      this.focus()
    }
  })
  const alreadyOpen = SelectorEngine.findOne(OPEN_SELECTOR)
  if (alreadyOpen && alreadyOpen !== target) {
    Offcanvas.getInstance(alreadyOpen).hide()
  }
  const data = Offcanvas.getOrCreateInstance(target)
  data.toggle(this)
})

EventHandler.on(window, EVENT_LOAD_DATA_API$2, () => {
  for (const selector of SelectorEngine.find(OPEN_SELECTOR)) {
    Offcanvas.getOrCreateInstance(selector).show()
  }
})

EventHandler.on(window, EVENT_RESIZE, () => {
  for (const element of SelectorEngine.find('[aria-modal][class*=show][class*=offcanvas-]')) {
    if (getComputedStyle(element).position !== 'fixed') {
      Offcanvas.getOrCreateInstance(element).hide()
    }
  }
})

enableDismissTrigger(Offcanvas)

defineJQueryPlugin(Offcanvas)

const uriAttributes = new Set(['background', 'cite', 'href', 'itemtype', 'longdesc', 'poster', 'src', 'xlink:href'])

const ARIA_ATTRIBUTE_PATTERN = /^aria-[\w-]*$/i

const SAFE_URL_PATTERN = /^(?:(?:https?|mailto|ftp|tel|file|sms):|[^#&/:?]*(?:[#/?]|$))/i

const DATA_URL_PATTERN = /^data:(?:image\/(?:bmp|gif|jpeg|jpg|png|tiff|webp)|video\/(?:mpeg|mp4|ogg|webm)|audio\/(?:mp3|oga|ogg|opus));base64,[\d+/a-z]+=*$/i

const allowedAttribute = (attribute, allowedAttributeList) => {
  const attributeName = attribute.nodeName.toLowerCase()
  if (allowedAttributeList.includes(attributeName)) {
    if (uriAttributes.has(attributeName)) {
      return Boolean(SAFE_URL_PATTERN.test(attribute.nodeValue) || DATA_URL_PATTERN.test(attribute.nodeValue))
    }
    return true
  }
  return allowedAttributeList.filter(attributeRegex => attributeRegex instanceof RegExp).some(regex => regex.test(attributeName))
}

const DefaultAllowlist = {
  '*': ['class', 'dir', 'id', 'lang', 'role', ARIA_ATTRIBUTE_PATTERN],
  a: ['target', 'href', 'title', 'rel'],
  area: [],
  b: [],
  br: [],
  col: [],
  code: [],
  div: [],
  em: [],
  hr: [],
  h1: [],
  h2: [],
  h3: [],
  h4: [],
  h5: [],
  h6: [],
  i: [],
  img: ['src', 'srcset', 'alt', 'title', 'width', 'height'],
  li: [],
  ol: [],
  p: [],
  pre: [],
  s: [],
  small: [],
  span: [],
  sub: [],
  sup: [],
  strong: [],
  u: [],
  ul: []
}

function sanitizeHtml (unsafeHtml, allowList, sanitizeFunction) {
  if (!unsafeHtml.length) {
    return unsafeHtml
  }
  if (sanitizeFunction && typeof sanitizeFunction === 'function') {
    return sanitizeFunction(unsafeHtml)
  }
  const domParser = new window.DOMParser()
  const createdDocument = domParser.parseFromString(unsafeHtml, 'text/html')
  const elements = [].concat(...createdDocument.body.querySelectorAll('*'))
  for (const element of elements) {
    const elementName = element.nodeName.toLowerCase()
    if (!Object.keys(allowList).includes(elementName)) {
      element.remove()
      continue
    }
    const attributeList = [].concat(...element.attributes)
    const allowedAttributes = [].concat(allowList['*'] || [], allowList[elementName] || [])
    for (const attribute of attributeList) {
      if (!allowedAttribute(attribute, allowedAttributes)) {
        element.removeAttribute(attribute.nodeName)
      }
    }
  }
  return createdDocument.body.innerHTML
}

const NAME$5 = 'TemplateFactory'

const Default$4 = {
  allowList: DefaultAllowlist,
  content: {},
  extraClass: '',
  html: false,
  sanitize: true,
  sanitizeFn: null,
  template: '<div></div>'
}

const DefaultType$4 = {
  allowList: 'object',
  content: 'object',
  extraClass: '(string|function)',
  html: 'boolean',
  sanitize: 'boolean',
  sanitizeFn: '(null|function)',
  template: 'string'
}

const DefaultContentType = {
  entry: '(string|element|function|null)',
  selector: '(string|element)'
}

class TemplateFactory extends Config {
  constructor (config) {
    super()
    this._config = this._getConfig(config)
  }

  static get Default () {
    return Default$4
  }

  static get DefaultType () {
    return DefaultType$4
  }

  static get NAME () {
    return NAME$5
  }

  getContent () {
    return Object.values(this._config.content).map(config => this._resolvePossibleFunction(config)).filter(Boolean)
  }

  hasContent () {
    return this.getContent().length > 0
  }

  changeContent (content) {
    this._checkContent(content)
    this._config.content = {
      ...this._config.content,
      ...content
    }
    return this
  }

  toHtml () {
    const templateWrapper = document.createElement('div')
    templateWrapper.innerHTML = this._maybeSanitize(this._config.template)
    for (const [selector, text] of Object.entries(this._config.content)) {
      this._setContent(templateWrapper, text, selector)
    }
    const template = templateWrapper.children[0]
    const extraClass = this._resolvePossibleFunction(this._config.extraClass)
    if (extraClass) {
      template.classList.add(...extraClass.split(' '))
    }
    return template
  }

  _typeCheckConfig (config) {
    super._typeCheckConfig(config)
    this._checkContent(config.content)
  }

  _checkContent (arg) {
    for (const [selector, content] of Object.entries(arg)) {
      super._typeCheckConfig({
        selector,
        entry: content
      }, DefaultContentType)
    }
  }

  _setContent (template, content, selector) {
    const templateElement = SelectorEngine.findOne(selector, template)
    if (!templateElement) {
      return
    }
    content = this._resolvePossibleFunction(content)
    if (!content) {
      templateElement.remove()
      return
    }
    if (isElement(content)) {
      this._putElementInTemplate(getElement(content), templateElement)
      return
    }
    if (this._config.html) {
      templateElement.innerHTML = this._maybeSanitize(content)
      return
    }
    templateElement.textContent = content
  }

  _maybeSanitize (arg) {
    return this._config.sanitize ? sanitizeHtml(arg, this._config.allowList, this._config.sanitizeFn) : arg
  }

  _resolvePossibleFunction (arg) {
    return typeof arg === 'function' ? arg(this) : arg
  }

  _putElementInTemplate (element, templateElement) {
    if (this._config.html) {
      templateElement.innerHTML = ''
      templateElement.append(element)
      return
    }
    templateElement.textContent = element.textContent
  }
}

const NAME$4 = 'tooltip'

const DISALLOWED_ATTRIBUTES = new Set(['sanitize', 'allowList', 'sanitizeFn'])

const CLASS_NAME_FADE$2 = 'fade'

const CLASS_NAME_MODAL = 'modal'

const CLASS_NAME_SHOW$2 = 'show'

const SELECTOR_TOOLTIP_INNER = '.tooltip-inner'

const SELECTOR_MODAL = `.${CLASS_NAME_MODAL}`

const EVENT_MODAL_HIDE = 'hide.bs.modal'

const TRIGGER_HOVER = 'hover'

const TRIGGER_FOCUS = 'focus'

const TRIGGER_CLICK = 'click'

const TRIGGER_MANUAL = 'manual'

const EVENT_HIDE$2 = 'hide'

const EVENT_HIDDEN$2 = 'hidden'

const EVENT_SHOW$2 = 'show'

const EVENT_SHOWN$2 = 'shown'

const EVENT_INSERTED = 'inserted'

const EVENT_CLICK$1 = 'click'

const EVENT_FOCUSIN$1 = 'focusin'

const EVENT_FOCUSOUT$1 = 'focusout'

const EVENT_MOUSEENTER = 'mouseenter'

const EVENT_MOUSELEAVE = 'mouseleave'

const AttachmentMap = {
  AUTO: 'auto',
  TOP: 'top',
  RIGHT: isRTL() ? 'left' : 'right',
  BOTTOM: 'bottom',
  LEFT: isRTL() ? 'right' : 'left'
}

const Default$3 = {
  allowList: DefaultAllowlist,
  animation: true,
  boundary: 'clippingParents',
  container: false,
  customClass: '',
  delay: 0,
  fallbackPlacements: ['top', 'right', 'bottom', 'left'],
  html: false,
  offset: [0, 0],
  placement: 'top',
  popperConfig: null,
  sanitize: true,
  sanitizeFn: null,
  selector: false,
  template: '<div class="tooltip" role="tooltip">' + '<div class="tooltip-arrow"></div>' + '<div class="tooltip-inner"></div>' + '</div>',
  title: '',
  trigger: 'hover focus'
}

const DefaultType$3 = {
  allowList: 'object',
  animation: 'boolean',
  boundary: '(string|element)',
  container: '(string|element|boolean)',
  customClass: '(string|function)',
  delay: '(number|object)',
  fallbackPlacements: 'array',
  html: 'boolean',
  offset: '(array|string|function)',
  placement: '(string|function)',
  popperConfig: '(null|object|function)',
  sanitize: 'boolean',
  sanitizeFn: '(null|function)',
  selector: '(string|boolean)',
  template: 'string',
  title: '(string|element|function)',
  trigger: 'string'
}

class Tooltip extends BaseComponent {
  constructor (element, config) {
    if (typeof Popper === 'undefined') {
      throw new TypeError("Bootstrap's tooltips require Popper (https://popper.js.org)")
    }
    super(element, config)
    this._isEnabled = true
    this._timeout = 0
    this._isHovered = null
    this._activeTrigger = {}
    this._popper = null
    this._templateFactory = null
    this._newContent = null
    this.tip = null
    this._setListeners()
    if (!this._config.selector) {
      this._fixTitle()
    }
  }

  static get Default () {
    return Default$3
  }

  static get DefaultType () {
    return DefaultType$3
  }

  static get NAME () {
    return NAME$4
  }

  enable () {
    this._isEnabled = true
  }

  disable () {
    this._isEnabled = false
  }

  toggleEnabled () {
    this._isEnabled = !this._isEnabled
  }

  toggle () {
    if (!this._isEnabled) {
      return
    }
    this._activeTrigger.click = !this._activeTrigger.click
    if (this._isShown()) {
      this._leave()
      return
    }
    this._enter()
  }

  dispose () {
    clearTimeout(this._timeout)
    EventHandler.off(this._element.closest(SELECTOR_MODAL), EVENT_MODAL_HIDE, this._hideModalHandler)
    if (this._element.getAttribute('data-bs-original-title')) {
      this._element.setAttribute('title', this._element.getAttribute('data-bs-original-title'))
    }
    this._disposePopper()
    super.dispose()
  }

  show () {
    if (this._element.style.display === 'none') {
      throw new Error('Please use show on visible elements')
    }
    if (!(this._isWithContent() && this._isEnabled)) {
      return
    }
    const showEvent = EventHandler.trigger(this._element, this.constructor.eventName(EVENT_SHOW$2))
    const shadowRoot = findShadowRoot(this._element)
    const isInTheDom = (shadowRoot || this._element.ownerDocument.documentElement).contains(this._element)
    if (showEvent.defaultPrevented || !isInTheDom) {
      return
    }
    this._disposePopper()
    const tip = this._getTipElement()
    this._element.setAttribute('aria-describedby', tip.getAttribute('id'))
    const { container } = this._config
    if (!this._element.ownerDocument.documentElement.contains(this.tip)) {
      container.append(tip)
      EventHandler.trigger(this._element, this.constructor.eventName(EVENT_INSERTED))
    }
    this._popper = this._createPopper(tip)
    tip.classList.add(CLASS_NAME_SHOW$2)
    if ('ontouchstart' in document.documentElement) {
      for (const element of [].concat(...document.body.children)) {
        EventHandler.on(element, 'mouseover', noop)
      }
    }
    const complete = () => {
      EventHandler.trigger(this._element, this.constructor.eventName(EVENT_SHOWN$2))
      if (this._isHovered === false) {
        this._leave()
      }
      this._isHovered = false
    }
    this._queueCallback(complete, this.tip, this._isAnimated())
  }

  hide () {
    if (!this._isShown()) {
      return
    }
    const hideEvent = EventHandler.trigger(this._element, this.constructor.eventName(EVENT_HIDE$2))
    if (hideEvent.defaultPrevented) {
      return
    }
    const tip = this._getTipElement()
    tip.classList.remove(CLASS_NAME_SHOW$2)
    if ('ontouchstart' in document.documentElement) {
      for (const element of [].concat(...document.body.children)) {
        EventHandler.off(element, 'mouseover', noop)
      }
    }
    this._activeTrigger[TRIGGER_CLICK] = false
    this._activeTrigger[TRIGGER_FOCUS] = false
    this._activeTrigger[TRIGGER_HOVER] = false
    this._isHovered = null
    const complete = () => {
      if (this._isWithActiveTrigger()) {
        return
      }
      if (!this._isHovered) {
        this._disposePopper()
      }
      this._element.removeAttribute('aria-describedby')
      EventHandler.trigger(this._element, this.constructor.eventName(EVENT_HIDDEN$2))
    }
    this._queueCallback(complete, this.tip, this._isAnimated())
  }

  update () {
    if (this._popper) {
      this._popper.update()
    }
  }

  _isWithContent () {
    return Boolean(this._getTitle())
  }

  _getTipElement () {
    if (!this.tip) {
      this.tip = this._createTipElement(this._newContent || this._getContentForTemplate())
    }
    return this.tip
  }

  _createTipElement (content) {
    const tip = this._getTemplateFactory(content).toHtml()
    if (!tip) {
      return null
    }
    tip.classList.remove(CLASS_NAME_FADE$2, CLASS_NAME_SHOW$2)
    tip.classList.add(`bs-${this.constructor.NAME}-auto`)
    const tipId = getUID(this.constructor.NAME).toString()
    tip.setAttribute('id', tipId)
    if (this._isAnimated()) {
      tip.classList.add(CLASS_NAME_FADE$2)
    }
    return tip
  }

  setContent (content) {
    this._newContent = content
    if (this._isShown()) {
      this._disposePopper()
      this.show()
    }
  }

  _getTemplateFactory (content) {
    if (this._templateFactory) {
      this._templateFactory.changeContent(content)
    } else {
      this._templateFactory = new TemplateFactory({
        ...this._config,
        content,
        extraClass: this._resolvePossibleFunction(this._config.customClass)
      })
    }
    return this._templateFactory
  }

  _getContentForTemplate () {
    return {
      [SELECTOR_TOOLTIP_INNER]: this._getTitle()
    }
  }

  _getTitle () {
    return this._resolvePossibleFunction(this._config.title) || this._element.getAttribute('data-bs-original-title')
  }

  _initializeOnDelegatedTarget (event) {
    return this.constructor.getOrCreateInstance(event.delegateTarget, this._getDelegateConfig())
  }

  _isAnimated () {
    return this._config.animation || this.tip && this.tip.classList.contains(CLASS_NAME_FADE$2)
  }

  _isShown () {
    return this.tip && this.tip.classList.contains(CLASS_NAME_SHOW$2)
  }

  _createPopper (tip) {
    const placement = typeof this._config.placement === 'function' ? this._config.placement.call(this, tip, this._element) : this._config.placement
    const attachment = AttachmentMap[placement.toUpperCase()]
    return createPopper(this._element, tip, this._getPopperConfig(attachment))
  }

  _getOffset () {
    const { offset } = this._config
    if (typeof offset === 'string') {
      return offset.split(',').map(value => Number.parseInt(value, 10))
    }
    if (typeof offset === 'function') {
      return popperData => offset(popperData, this._element)
    }
    return offset
  }

  _resolvePossibleFunction (arg) {
    return typeof arg === 'function' ? arg.call(this._element) : arg
  }

  _getPopperConfig (attachment) {
    const defaultBsPopperConfig = {
      placement: attachment,
      modifiers: [{
        name: 'flip',
        options: {
          fallbackPlacements: this._config.fallbackPlacements
        }
      }, {
        name: 'offset',
        options: {
          offset: this._getOffset()
        }
      }, {
        name: 'preventOverflow',
        options: {
          boundary: this._config.boundary
        }
      }, {
        name: 'arrow',
        options: {
          element: `.${this.constructor.NAME}-arrow`
        }
      }, {
        name: 'preSetPlacement',
        enabled: true,
        phase: 'beforeMain',
        fn: data => {
          this._getTipElement().setAttribute('data-popper-placement', data.state.placement)
        }
      }]
    }
    return {
      ...defaultBsPopperConfig,
      ...typeof this._config.popperConfig === 'function' ? this._config.popperConfig(defaultBsPopperConfig) : this._config.popperConfig
    }
  }

  _setListeners () {
    const triggers = this._config.trigger.split(' ')
    for (const trigger of triggers) {
      if (trigger === 'click') {
        EventHandler.on(this._element, this.constructor.eventName(EVENT_CLICK$1), this._config.selector, event => {
          const context = this._initializeOnDelegatedTarget(event)
          context.toggle()
        })
      } else if (trigger !== TRIGGER_MANUAL) {
        const eventIn = trigger === TRIGGER_HOVER ? this.constructor.eventName(EVENT_MOUSEENTER) : this.constructor.eventName(EVENT_FOCUSIN$1)
        const eventOut = trigger === TRIGGER_HOVER ? this.constructor.eventName(EVENT_MOUSELEAVE) : this.constructor.eventName(EVENT_FOCUSOUT$1)
        EventHandler.on(this._element, eventIn, this._config.selector, event => {
          const context = this._initializeOnDelegatedTarget(event)
          context._activeTrigger[event.type === 'focusin' ? TRIGGER_FOCUS : TRIGGER_HOVER] = true
          context._enter()
        })
        EventHandler.on(this._element, eventOut, this._config.selector, event => {
          const context = this._initializeOnDelegatedTarget(event)
          context._activeTrigger[event.type === 'focusout' ? TRIGGER_FOCUS : TRIGGER_HOVER] = context._element.contains(event.relatedTarget)
          context._leave()
        })
      }
    }
    this._hideModalHandler = () => {
      if (this._element) {
        this.hide()
      }
    }
    EventHandler.on(this._element.closest(SELECTOR_MODAL), EVENT_MODAL_HIDE, this._hideModalHandler)
  }

  _fixTitle () {
    const title = this._element.getAttribute('title')
    if (!title) {
      return
    }
    if (!this._element.getAttribute('aria-label') && !this._element.textContent.trim()) {
      this._element.setAttribute('aria-label', title)
    }
    this._element.setAttribute('data-bs-original-title', title)
    this._element.removeAttribute('title')
  }

  _enter () {
    if (this._isShown() || this._isHovered) {
      this._isHovered = true
      return
    }
    this._isHovered = true
    this._setTimeout(() => {
      if (this._isHovered) {
        this.show()
      }
    }, this._config.delay.show)
  }

  _leave () {
    if (this._isWithActiveTrigger()) {
      return
    }
    this._isHovered = false
    this._setTimeout(() => {
      if (!this._isHovered) {
        this.hide()
      }
    }, this._config.delay.hide)
  }

  _setTimeout (handler, timeout) {
    clearTimeout(this._timeout)
    this._timeout = setTimeout(handler, timeout)
  }

  _isWithActiveTrigger () {
    return Object.values(this._activeTrigger).includes(true)
  }

  _getConfig (config) {
    const dataAttributes = Manipulator.getDataAttributes(this._element)
    for (const dataAttribute of Object.keys(dataAttributes)) {
      if (DISALLOWED_ATTRIBUTES.has(dataAttribute)) {
        delete dataAttributes[dataAttribute]
      }
    }
    config = {
      ...dataAttributes,
      ...typeof config === 'object' && config ? config : {}
    }
    config = this._mergeConfigObj(config)
    config = this._configAfterMerge(config)
    this._typeCheckConfig(config)
    return config
  }

  _configAfterMerge (config) {
    config.container = config.container === false ? document.body : getElement(config.container)
    if (typeof config.delay === 'number') {
      config.delay = {
        show: config.delay,
        hide: config.delay
      }
    }
    if (typeof config.title === 'number') {
      config.title = config.title.toString()
    }
    if (typeof config.content === 'number') {
      config.content = config.content.toString()
    }
    return config
  }

  _getDelegateConfig () {
    const config = {}
    for (const key in this._config) {
      if (this.constructor.Default[key] !== this._config[key]) {
        config[key] = this._config[key]
      }
    }
    config.selector = false
    config.trigger = 'manual'
    return config
  }

  _disposePopper () {
    if (this._popper) {
      this._popper.destroy()
      this._popper = null
    }
    if (this.tip) {
      this.tip.remove()
      this.tip = null
    }
  }

  static jQueryInterface (config) {
    return this.each(function () {
      const data = Tooltip.getOrCreateInstance(this, config)
      if (typeof config !== 'string') {
        return
      }
      if (typeof data[config] === 'undefined') {
        throw new TypeError(`No method named "${config}"`)
      }
      data[config]()
    })
  }
}

defineJQueryPlugin(Tooltip)

const NAME$3 = 'popover'

const SELECTOR_TITLE = '.popover-header'

const SELECTOR_CONTENT = '.popover-body'

const Default$2 = {
  ...Tooltip.Default,
  content: '',
  offset: [0, 8],
  placement: 'right',
  template: '<div class="popover" role="tooltip">' + '<div class="popover-arrow"></div>' + '<h3 class="popover-header"></h3>' + '<div class="popover-body"></div>' + '</div>',
  trigger: 'click'
}

const DefaultType$2 = {
  ...Tooltip.DefaultType,
  content: '(null|string|element|function)'
}

class Popover extends Tooltip {
  static get Default () {
    return Default$2
  }

  static get DefaultType () {
    return DefaultType$2
  }

  static get NAME () {
    return NAME$3
  }

  _isWithContent () {
    return this._getTitle() || this._getContent()
  }

  _getContentForTemplate () {
    return {
      [SELECTOR_TITLE]: this._getTitle(),
      [SELECTOR_CONTENT]: this._getContent()
    }
  }

  _getContent () {
    return this._resolvePossibleFunction(this._config.content)
  }

  static jQueryInterface (config) {
    return this.each(function () {
      const data = Popover.getOrCreateInstance(this, config)
      if (typeof config !== 'string') {
        return
      }
      if (typeof data[config] === 'undefined') {
        throw new TypeError(`No method named "${config}"`)
      }
      data[config]()
    })
  }
}

defineJQueryPlugin(Popover)

const NAME$2 = 'scrollspy'

const DATA_KEY$2 = 'bs.scrollspy'

const EVENT_KEY$2 = `.${DATA_KEY$2}`

const DATA_API_KEY = '.data-api'

const EVENT_ACTIVATE = `activate${EVENT_KEY$2}`

const EVENT_CLICK = `click${EVENT_KEY$2}`

const EVENT_LOAD_DATA_API$1 = `load${EVENT_KEY$2}${DATA_API_KEY}`

const CLASS_NAME_DROPDOWN_ITEM = 'dropdown-item'

const CLASS_NAME_ACTIVE$1 = 'active'

const SELECTOR_DATA_SPY = '[data-bs-spy="scroll"]'

const SELECTOR_TARGET_LINKS = '[href]'

const SELECTOR_NAV_LIST_GROUP = '.nav, .list-group'

const SELECTOR_NAV_LINKS = '.nav-link'

const SELECTOR_NAV_ITEMS = '.nav-item'

const SELECTOR_LIST_ITEMS = '.list-group-item'

const SELECTOR_LINK_ITEMS = `${SELECTOR_NAV_LINKS}, ${SELECTOR_NAV_ITEMS} > ${SELECTOR_NAV_LINKS}, ${SELECTOR_LIST_ITEMS}`

const SELECTOR_DROPDOWN = '.dropdown'

const SELECTOR_DROPDOWN_TOGGLE$1 = '.dropdown-toggle'

const Default$1 = {
  offset: null,
  rootMargin: '0px 0px -25%',
  smoothScroll: false,
  target: null,
  threshold: [0.1, 0.5, 1]
}

const DefaultType$1 = {
  offset: '(number|null)',
  rootMargin: 'string',
  smoothScroll: 'boolean',
  target: 'element',
  threshold: 'array'
}

class ScrollSpy extends BaseComponent {
  constructor (element, config) {
    super(element, config)
    this._targetLinks = new Map()
    this._observableSections = new Map()
    this._rootElement = getComputedStyle(this._element).overflowY === 'visible' ? null : this._element
    this._activeTarget = null
    this._observer = null
    this._previousScrollData = {
      visibleEntryTop: 0,
      parentScrollTop: 0
    }
    this.refresh()
  }

  static get Default () {
    return Default$1
  }

  static get DefaultType () {
    return DefaultType$1
  }

  static get NAME () {
    return NAME$2
  }

  refresh () {
    this._initializeTargetsAndObservables()
    this._maybeEnableSmoothScroll()
    if (this._observer) {
      this._observer.disconnect()
    } else {
      this._observer = this._getNewObserver()
    }
    for (const section of this._observableSections.values()) {
      this._observer.observe(section)
    }
  }

  dispose () {
    this._observer.disconnect()
    super.dispose()
  }

  _configAfterMerge (config) {
    config.target = getElement(config.target) || document.body
    config.rootMargin = config.offset ? `${config.offset}px 0px -30%` : config.rootMargin
    if (typeof config.threshold === 'string') {
      config.threshold = config.threshold.split(',').map(value => Number.parseFloat(value))
    }
    return config
  }

  _maybeEnableSmoothScroll () {
    if (!this._config.smoothScroll) {
      return
    }
    EventHandler.off(this._config.target, EVENT_CLICK)
    EventHandler.on(this._config.target, EVENT_CLICK, SELECTOR_TARGET_LINKS, event => {
      const observableSection = this._observableSections.get(event.target.hash)
      if (observableSection) {
        event.preventDefault()
        const root = this._rootElement || window
        const height = observableSection.offsetTop - this._element.offsetTop
        if (root.scrollTo) {
          root.scrollTo({
            top: height,
            behavior: 'smooth'
          })
          return
        }
        root.scrollTop = height
      }
    })
  }

  _getNewObserver () {
    const options = {
      root: this._rootElement,
      threshold: this._config.threshold,
      rootMargin: this._config.rootMargin
    }
    return new IntersectionObserver(entries => this._observerCallback(entries), options)
  }

  _observerCallback (entries) {
    const targetElement = entry => this._targetLinks.get(`#${entry.target.id}`)
    const activate = entry => {
      this._previousScrollData.visibleEntryTop = entry.target.offsetTop
      this._process(targetElement(entry))
    }
    const parentScrollTop = (this._rootElement || document.documentElement).scrollTop
    const userScrollsDown = parentScrollTop >= this._previousScrollData.parentScrollTop
    this._previousScrollData.parentScrollTop = parentScrollTop
    for (const entry of entries) {
      if (!entry.isIntersecting) {
        this._activeTarget = null
        this._clearActiveClass(targetElement(entry))
        continue
      }
      const entryIsLowerThanPrevious = entry.target.offsetTop >= this._previousScrollData.visibleEntryTop
      if (userScrollsDown && entryIsLowerThanPrevious) {
        activate(entry)
        if (!parentScrollTop) {
          return
        }
        continue
      }
      if (!userScrollsDown && !entryIsLowerThanPrevious) {
        activate(entry)
      }
    }
  }

  _initializeTargetsAndObservables () {
    this._targetLinks = new Map()
    this._observableSections = new Map()
    const targetLinks = SelectorEngine.find(SELECTOR_TARGET_LINKS, this._config.target)
    for (const anchor of targetLinks) {
      if (!anchor.hash || isDisabled(anchor)) {
        continue
      }
      const observableSection = SelectorEngine.findOne(anchor.hash, this._element)
      if (isVisible(observableSection)) {
        this._targetLinks.set(anchor.hash, anchor)
        this._observableSections.set(anchor.hash, observableSection)
      }
    }
  }

  _process (target) {
    if (this._activeTarget === target) {
      return
    }
    this._clearActiveClass(this._config.target)
    this._activeTarget = target
    target.classList.add(CLASS_NAME_ACTIVE$1)
    this._activateParents(target)
    EventHandler.trigger(this._element, EVENT_ACTIVATE, {
      relatedTarget: target
    })
  }

  _activateParents (target) {
    if (target.classList.contains(CLASS_NAME_DROPDOWN_ITEM)) {
      SelectorEngine.findOne(SELECTOR_DROPDOWN_TOGGLE$1, target.closest(SELECTOR_DROPDOWN)).classList.add(CLASS_NAME_ACTIVE$1)
      return
    }
    for (const listGroup of SelectorEngine.parents(target, SELECTOR_NAV_LIST_GROUP)) {
      for (const item of SelectorEngine.prev(listGroup, SELECTOR_LINK_ITEMS)) {
        item.classList.add(CLASS_NAME_ACTIVE$1)
      }
    }
  }

  _clearActiveClass (parent) {
    parent.classList.remove(CLASS_NAME_ACTIVE$1)
    const activeNodes = SelectorEngine.find(`${SELECTOR_TARGET_LINKS}.${CLASS_NAME_ACTIVE$1}`, parent)
    for (const node of activeNodes) {
      node.classList.remove(CLASS_NAME_ACTIVE$1)
    }
  }

  static jQueryInterface (config) {
    return this.each(function () {
      const data = ScrollSpy.getOrCreateInstance(this, config)
      if (typeof config !== 'string') {
        return
      }
      if (data[config] === undefined || config.startsWith('_') || config === 'constructor') {
        throw new TypeError(`No method named "${config}"`)
      }
      data[config]()
    })
  }
}

EventHandler.on(window, EVENT_LOAD_DATA_API$1, () => {
  for (const spy of SelectorEngine.find(SELECTOR_DATA_SPY)) {
    ScrollSpy.getOrCreateInstance(spy)
  }
})

defineJQueryPlugin(ScrollSpy)

const NAME$1 = 'tab'

const DATA_KEY$1 = 'bs.tab'

const EVENT_KEY$1 = `.${DATA_KEY$1}`

const EVENT_HIDE$1 = `hide${EVENT_KEY$1}`

const EVENT_HIDDEN$1 = `hidden${EVENT_KEY$1}`

const EVENT_SHOW$1 = `show${EVENT_KEY$1}`

const EVENT_SHOWN$1 = `shown${EVENT_KEY$1}`

const EVENT_CLICK_DATA_API = `click${EVENT_KEY$1}`

const EVENT_KEYDOWN = `keydown${EVENT_KEY$1}`

const EVENT_LOAD_DATA_API = `load${EVENT_KEY$1}`

const ARROW_LEFT_KEY = 'ArrowLeft'

const ARROW_RIGHT_KEY = 'ArrowRight'

const ARROW_UP_KEY = 'ArrowUp'

const ARROW_DOWN_KEY = 'ArrowDown'

const CLASS_NAME_ACTIVE = 'active'

const CLASS_NAME_FADE$1 = 'fade'

const CLASS_NAME_SHOW$1 = 'show'

const CLASS_DROPDOWN = 'dropdown'

const SELECTOR_DROPDOWN_TOGGLE = '.dropdown-toggle'

const SELECTOR_DROPDOWN_MENU = '.dropdown-menu'

const NOT_SELECTOR_DROPDOWN_TOGGLE = ':not(.dropdown-toggle)'

const SELECTOR_TAB_PANEL = '.list-group, .nav, [role="tablist"]'

const SELECTOR_OUTER = '.nav-item, .list-group-item'

const SELECTOR_INNER = `.nav-link${NOT_SELECTOR_DROPDOWN_TOGGLE}, .list-group-item${NOT_SELECTOR_DROPDOWN_TOGGLE}, [role="tab"]${NOT_SELECTOR_DROPDOWN_TOGGLE}`

const SELECTOR_DATA_TOGGLE = '[data-bs-toggle="tab"], [data-bs-toggle="pill"], [data-bs-toggle="list"]'

const SELECTOR_INNER_ELEM = `${SELECTOR_INNER}, ${SELECTOR_DATA_TOGGLE}`

const SELECTOR_DATA_TOGGLE_ACTIVE = `.${CLASS_NAME_ACTIVE}[data-bs-toggle="tab"], .${CLASS_NAME_ACTIVE}[data-bs-toggle="pill"], .${CLASS_NAME_ACTIVE}[data-bs-toggle="list"]`

class Tab extends BaseComponent {
  constructor (element) {
    super(element)
    this._parent = this._element.closest(SELECTOR_TAB_PANEL)
    if (!this._parent) {
      return
    }
    this._setInitialAttributes(this._parent, this._getChildren())
    EventHandler.on(this._element, EVENT_KEYDOWN, event => this._keydown(event))
  }

  static get NAME () {
    return NAME$1
  }

  show () {
    const innerElem = this._element
    if (this._elemIsActive(innerElem)) {
      return
    }
    const active = this._getActiveElem()
    const hideEvent = active
      ? EventHandler.trigger(active, EVENT_HIDE$1, {
        relatedTarget: innerElem
      })
      : null
    const showEvent = EventHandler.trigger(innerElem, EVENT_SHOW$1, {
      relatedTarget: active
    })
    if (showEvent.defaultPrevented || hideEvent && hideEvent.defaultPrevented) {
      return
    }
    this._deactivate(active, innerElem)
    this._activate(innerElem, active)
  }

  _activate (element, relatedElem) {
    if (!element) {
      return
    }
    element.classList.add(CLASS_NAME_ACTIVE)
    this._activate(getElementFromSelector(element))
    const complete = () => {
      if (element.getAttribute('role') !== 'tab') {
        element.classList.add(CLASS_NAME_SHOW$1)
        return
      }
      element.removeAttribute('tabindex')
      element.setAttribute('aria-selected', true)
      this._toggleDropDown(element, true)
      EventHandler.trigger(element, EVENT_SHOWN$1, {
        relatedTarget: relatedElem
      })
    }
    this._queueCallback(complete, element, element.classList.contains(CLASS_NAME_FADE$1))
  }

  _deactivate (element, relatedElem) {
    if (!element) {
      return
    }
    element.classList.remove(CLASS_NAME_ACTIVE)
    element.blur()
    this._deactivate(getElementFromSelector(element))
    const complete = () => {
      if (element.getAttribute('role') !== 'tab') {
        element.classList.remove(CLASS_NAME_SHOW$1)
        return
      }
      element.setAttribute('aria-selected', false)
      element.setAttribute('tabindex', '-1')
      this._toggleDropDown(element, false)
      EventHandler.trigger(element, EVENT_HIDDEN$1, {
        relatedTarget: relatedElem
      })
    }
    this._queueCallback(complete, element, element.classList.contains(CLASS_NAME_FADE$1))
  }

  _keydown (event) {
    if (![ARROW_LEFT_KEY, ARROW_RIGHT_KEY, ARROW_UP_KEY, ARROW_DOWN_KEY].includes(event.key)) {
      return
    }
    event.stopPropagation()
    event.preventDefault()
    const isNext = [ARROW_RIGHT_KEY, ARROW_DOWN_KEY].includes(event.key)
    const nextActiveElement = getNextActiveElement(this._getChildren().filter(element => !isDisabled(element)), event.target, isNext, true)
    if (nextActiveElement) {
      nextActiveElement.focus({
        preventScroll: true
      })
      Tab.getOrCreateInstance(nextActiveElement).show()
    }
  }

  _getChildren () {
    return SelectorEngine.find(SELECTOR_INNER_ELEM, this._parent)
  }

  _getActiveElem () {
    return this._getChildren().find(child => this._elemIsActive(child)) || null
  }

  _setInitialAttributes (parent, children) {
    this._setAttributeIfNotExists(parent, 'role', 'tablist')
    for (const child of children) {
      this._setInitialAttributesOnChild(child)
    }
  }

  _setInitialAttributesOnChild (child) {
    child = this._getInnerElement(child)
    const isActive = this._elemIsActive(child)
    const outerElem = this._getOuterElement(child)
    child.setAttribute('aria-selected', isActive)
    if (outerElem !== child) {
      this._setAttributeIfNotExists(outerElem, 'role', 'presentation')
    }
    if (!isActive) {
      child.setAttribute('tabindex', '-1')
    }
    this._setAttributeIfNotExists(child, 'role', 'tab')
    this._setInitialAttributesOnTargetPanel(child)
  }

  _setInitialAttributesOnTargetPanel (child) {
    const target = getElementFromSelector(child)
    if (!target) {
      return
    }
    this._setAttributeIfNotExists(target, 'role', 'tabpanel')
    if (child.id) {
      this._setAttributeIfNotExists(target, 'aria-labelledby', `#${child.id}`)
    }
  }

  _toggleDropDown (element, open) {
    const outerElem = this._getOuterElement(element)
    if (!outerElem.classList.contains(CLASS_DROPDOWN)) {
      return
    }
    const toggle = (selector, className) => {
      const element = SelectorEngine.findOne(selector, outerElem)
      if (element) {
        element.classList.toggle(className, open)
      }
    }
    toggle(SELECTOR_DROPDOWN_TOGGLE, CLASS_NAME_ACTIVE)
    toggle(SELECTOR_DROPDOWN_MENU, CLASS_NAME_SHOW$1)
    outerElem.setAttribute('aria-expanded', open)
  }

  _setAttributeIfNotExists (element, attribute, value) {
    if (!element.hasAttribute(attribute)) {
      element.setAttribute(attribute, value)
    }
  }

  _elemIsActive (elem) {
    return elem.classList.contains(CLASS_NAME_ACTIVE)
  }

  _getInnerElement (elem) {
    return elem.matches(SELECTOR_INNER_ELEM) ? elem : SelectorEngine.findOne(SELECTOR_INNER_ELEM, elem)
  }

  _getOuterElement (elem) {
    return elem.closest(SELECTOR_OUTER) || elem
  }

  static jQueryInterface (config) {
    return this.each(function () {
      const data = Tab.getOrCreateInstance(this)
      if (typeof config !== 'string') {
        return
      }
      if (data[config] === undefined || config.startsWith('_') || config === 'constructor') {
        throw new TypeError(`No method named "${config}"`)
      }
      data[config]()
    })
  }
}

EventHandler.on(document, EVENT_CLICK_DATA_API, SELECTOR_DATA_TOGGLE, function (event) {
  if (['A', 'AREA'].includes(this.tagName)) {
    event.preventDefault()
  }
  if (isDisabled(this)) {
    return
  }
  Tab.getOrCreateInstance(this).show()
})

EventHandler.on(window, EVENT_LOAD_DATA_API, () => {
  for (const element of SelectorEngine.find(SELECTOR_DATA_TOGGLE_ACTIVE)) {
    Tab.getOrCreateInstance(element)
  }
})

defineJQueryPlugin(Tab)

const NAME = 'toast'

const DATA_KEY = 'bs.toast'

const EVENT_KEY = `.${DATA_KEY}`

const EVENT_MOUSEOVER = `mouseover${EVENT_KEY}`

const EVENT_MOUSEOUT = `mouseout${EVENT_KEY}`

const EVENT_FOCUSIN = `focusin${EVENT_KEY}`

const EVENT_FOCUSOUT = `focusout${EVENT_KEY}`

const EVENT_HIDE = `hide${EVENT_KEY}`

const EVENT_HIDDEN = `hidden${EVENT_KEY}`

const EVENT_SHOW = `show${EVENT_KEY}`

const EVENT_SHOWN = `shown${EVENT_KEY}`

const CLASS_NAME_FADE = 'fade'

const CLASS_NAME_HIDE = 'hide'

const CLASS_NAME_SHOW = 'show'

const CLASS_NAME_SHOWING = 'showing'

const DefaultType = {
  animation: 'boolean',
  autohide: 'boolean',
  delay: 'number'
}

const Default = {
  animation: true,
  autohide: true,
  delay: 5e3
}

class Toast extends BaseComponent {
  constructor (element, config) {
    super(element, config)
    this._timeout = null
    this._hasMouseInteraction = false
    this._hasKeyboardInteraction = false
    this._setListeners()
  }

  static get Default () {
    return Default
  }

  static get DefaultType () {
    return DefaultType
  }

  static get NAME () {
    return NAME
  }

  show () {
    const showEvent = EventHandler.trigger(this._element, EVENT_SHOW)
    if (showEvent.defaultPrevented) {
      return
    }
    this._clearTimeout()
    if (this._config.animation) {
      this._element.classList.add(CLASS_NAME_FADE)
    }
    const complete = () => {
      this._element.classList.remove(CLASS_NAME_SHOWING)
      EventHandler.trigger(this._element, EVENT_SHOWN)
      this._maybeScheduleHide()
    }
    this._element.classList.remove(CLASS_NAME_HIDE)
    reflow(this._element)
    this._element.classList.add(CLASS_NAME_SHOW, CLASS_NAME_SHOWING)
    this._queueCallback(complete, this._element, this._config.animation)
  }

  hide () {
    if (!this.isShown()) {
      return
    }
    const hideEvent = EventHandler.trigger(this._element, EVENT_HIDE)
    if (hideEvent.defaultPrevented) {
      return
    }
    const complete = () => {
      this._element.classList.add(CLASS_NAME_HIDE)
      this._element.classList.remove(CLASS_NAME_SHOWING, CLASS_NAME_SHOW)
      EventHandler.trigger(this._element, EVENT_HIDDEN)
    }
    this._element.classList.add(CLASS_NAME_SHOWING)
    this._queueCallback(complete, this._element, this._config.animation)
  }

  dispose () {
    this._clearTimeout()
    if (this.isShown()) {
      this._element.classList.remove(CLASS_NAME_SHOW)
    }
    super.dispose()
  }

  isShown () {
    return this._element.classList.contains(CLASS_NAME_SHOW)
  }

  _maybeScheduleHide () {
    if (!this._config.autohide) {
      return
    }
    if (this._hasMouseInteraction || this._hasKeyboardInteraction) {
      return
    }
    this._timeout = setTimeout(() => {
      this.hide()
    }, this._config.delay)
  }

  _onInteraction (event, isInteracting) {
    switch (event.type) {
      case 'mouseover':
      case 'mouseout':
      {
        this._hasMouseInteraction = isInteracting
        break
      }

      case 'focusin':
      case 'focusout':
      {
        this._hasKeyboardInteraction = isInteracting
        break
      }
    }
    if (isInteracting) {
      this._clearTimeout()
      return
    }
    const nextElement = event.relatedTarget
    if (this._element === nextElement || this._element.contains(nextElement)) {
      return
    }
    this._maybeScheduleHide()
  }

  _setListeners () {
    EventHandler.on(this._element, EVENT_MOUSEOVER, event => this._onInteraction(event, true))
    EventHandler.on(this._element, EVENT_MOUSEOUT, event => this._onInteraction(event, false))
    EventHandler.on(this._element, EVENT_FOCUSIN, event => this._onInteraction(event, true))
    EventHandler.on(this._element, EVENT_FOCUSOUT, event => this._onInteraction(event, false))
  }

  _clearTimeout () {
    clearTimeout(this._timeout)
    this._timeout = null
  }

  static jQueryInterface (config) {
    return this.each(function () {
      const data = Toast.getOrCreateInstance(this, config)
      if (typeof config === 'string') {
        if (typeof data[config] === 'undefined') {
          throw new TypeError(`No method named "${config}"`)
        }
        data[config](this)
      }
    })
  }
}

enableDismissTrigger(Toast)

defineJQueryPlugin(Toast)

const Bootstrap = Object.freeze({
  __proto__: null,
  Alert,
  Button,
  Carousel,
  Collapse,
  Dropdown,
  Modal,
  Offcanvas,
  Popover,
  ScrollSpy,
  Tab,
  Toast,
  Tooltip
})

if (!window.bootstrap) {
  window.bootstrap = Bootstrap
}

const MmToggler = (function () {
  function MmToggler (mediaquery) {
    const _this = this
    this.listener = function (evnt) {
      (evnt.matches ? _this.matchFns : _this.unmatchFns).forEach(function (listener) {
        listener()
      })
    }
    this.toggler = window.matchMedia(mediaquery)
    this.toggler.addListener(this.listener)
    this.matchFns = []
    this.unmatchFns = []
  }
  MmToggler.prototype.add = function (match, unmatch) {
    this.matchFns.push(match)
    this.unmatchFns.push(unmatch);
    (this.toggler.matches ? match : unmatch)()
  }
  return MmToggler
}())

const r = function (list) {
  return Array.prototype.slice.call(list)
}

const $ = function (selector, context) {
  return r((context || document).querySelectorAll(selector))
}

const prefix$1 = 'mm-spn'

const MmSlidingPanelsNavigation = (function () {
  function MmSlidingPanelsNavigation (node, title, selectedClass, slidingSubmenus, theme) {
    this.node = node
    this.title = title
    this.slidingSubmenus = slidingSubmenus
    this.selectedClass = selectedClass
    this.node.classList.add(prefix$1)
    this.node.classList.add(prefix$1 + '--' + theme)
    this.node.classList.add(prefix$1 + '--' + (this.slidingSubmenus ? 'navbar' : 'vertical'))
    this._setSelectedl()
    this._initAnchors()
  }
  Object.defineProperty(MmSlidingPanelsNavigation.prototype, 'prefix', {
    get: function () {
      return prefix$1
    },
    enumerable: false,
    configurable: true
  })
  MmSlidingPanelsNavigation.prototype.openPanel = function (panel) {
    const listitem = panel.parentElement
    if (this.slidingSubmenus) {
      let title_1 = panel.dataset.mmSpnTitle
      if (listitem === this.node) {
        this.node.classList.add(prefix$1 + '--main')
      } else {
        this.node.classList.remove(prefix$1 + '--main')
        if (!title_1) {
          r(listitem.children).forEach(function (child) {
            if (child.matches('a, span')) {
              title_1 = child.textContent
            }
          })
        }
      }
      if (!title_1) {
        title_1 = this.title
      }
      this.node.dataset.mmSpnTitle = title_1
      $('.' + prefix$1 + '--open', this.node).forEach(function (open) {
        open.classList.remove(prefix$1 + '--open')
        open.classList.remove(prefix$1 + '--parent')
      })
      panel.classList.add(prefix$1 + '--open')
      panel.classList.remove(prefix$1 + '--parent')
      let parent_1 = panel.parentElement.closest('ul')
      while (parent_1) {
        parent_1.classList.add(prefix$1 + '--open')
        parent_1.classList.add(prefix$1 + '--parent')
        parent_1 = parent_1.parentElement.closest('ul')
      }
    } else {
      const isOpened = panel.matches('.' + prefix$1 + '--open')
      $('.' + prefix$1 + '--open', this.node).forEach(function (open) {
        open.classList.remove(prefix$1 + '--open')
      })
      panel.classList[isOpened ? 'remove' : 'add'](prefix$1 + '--open')
      let parent_2 = panel.parentElement.closest('ul')
      while (parent_2) {
        parent_2.classList.add(prefix$1 + '--open')
        parent_2 = parent_2.parentElement.closest('ul')
      }
    }
  }
  MmSlidingPanelsNavigation.prototype._setSelectedl = function () {
    const listitems = $('.' + this.selectedClass, this.node)
    const listitem = listitems[listitems.length - 1]
    let panel = null
    if (listitem) {
      panel = listitem.closest('ul')
    }
    if (!panel) {
      panel = this.node.querySelector('ul')
    }
    this.openPanel(panel)
  }
  MmSlidingPanelsNavigation.prototype._initAnchors = function () {
    const _this = this
    const clickAnchor = function (target) {
      if (target.matches('a')) {
        return true
      }
      return false
    }
    const openSubmenu = function (target) {
      let listitem
      if (target.closest('span')) {
        listitem = target.parentElement
      } else if (target.closest('li')) {
        listitem = target
      } else {
        listitem = false
      }
      if (listitem) {
        r(listitem.children).forEach(function (panel) {
          if (panel.matches('ul')) {
            _this.openPanel(panel)
          }
        })
        return true
      }
      return false
    }
    const closeSubmenu = function (target) {
      const panels = $('.' + prefix$1 + '--open', target)
      const panel = panels[panels.length - 1]
      if (panel) {
        const parent_3 = panel.parentElement.closest('ul')
        if (parent_3) {
          _this.openPanel(parent_3)
          return true
        }
      }
      return false
    }
    this.node.addEventListener('click', function (evnt) {
      const target = evnt.target
      let handled = false
      handled = handled || clickAnchor(target)
      handled = handled || openSubmenu(target)
      handled = handled || closeSubmenu(target)
      if (handled) {
        evnt.stopImmediatePropagation()
      }
    })
  }
  return MmSlidingPanelsNavigation
}())

const prefix = 'mm-ocd'

const MmOffCanvasDrawer = (function () {
  function MmOffCanvasDrawer (node, position) {
    const _this = this
    if (node === void 0) {
      node = null
    }
    this.wrapper = document.createElement('div')
    this.wrapper.classList.add('' + prefix)
    this.wrapper.classList.add(prefix + '--' + position)
    this.content = document.createElement('div')
    this.content.classList.add(prefix + '__content')
    this.wrapper.append(this.content)
    this.backdrop = document.createElement('div')
    this.backdrop.classList.add(prefix + '__backdrop')
    this.wrapper.append(this.backdrop)
    document.body.append(this.wrapper)
    if (node) {
      this.content.append(node)
    }
    const close = function (evnt) {
      _this.close()
      evnt.stopImmediatePropagation()
    }
    this.backdrop.addEventListener('touchstart', close, {
      passive: true
    })
    this.backdrop.addEventListener('mousedown', close, {
      passive: true
    })
  }
  Object.defineProperty(MmOffCanvasDrawer.prototype, 'prefix', {
    get: function () {
      return prefix
    },
    enumerable: false,
    configurable: true
  })
  MmOffCanvasDrawer.prototype.open = function () {
    this.wrapper.classList.add(prefix + '--open')
    document.body.classList.add(prefix + '-opened')
  }
  MmOffCanvasDrawer.prototype.close = function () {
    this.wrapper.classList.remove(prefix + '--open')
    document.body.classList.remove(prefix + '-opened')
  }
  return MmOffCanvasDrawer
}())

const MmenuLight = (function () {
  function MmenuLight (menu, mediaQuery) {
    if (mediaQuery === void 0) {
      mediaQuery = 'all'
    }
    this.menu = menu
    this.toggler = new MmToggler(mediaQuery)
  }
  MmenuLight.prototype.navigation = function (options) {
    const _this = this
    if (!this.navigator) {
      options = options || {}
      const _a = options.title; const title = _a === void 0 ? 'Menu' : _a; const _b = options.selectedClass; const selectedClass = _b === void 0 ? 'Selected' : _b; const _c = options.slidingSubmenus; const slidingSubmenus = _c === void 0 ? true : _c; const _d = options.theme; const theme = _d === void 0 ? 'light' : _d
      this.navigator = new MmSlidingPanelsNavigation(this.menu, title, selectedClass, slidingSubmenus, theme)
      this.toggler.add(function () {
        return _this.menu.classList.add(_this.navigator.prefix)
      }, function () {
        return _this.menu.classList.remove(_this.navigator.prefix)
      })
    }
    return this.navigator
  }
  MmenuLight.prototype.offcanvas = function (options) {
    const _this = this
    if (!this.drawer) {
      options = options || {}
      const _a = options.position; const position = _a === void 0 ? 'left' : _a
      this.drawer = new MmOffCanvasDrawer(null, position)
      const orgLocation_1 = document.createComment('original menu location')
      this.menu.after(orgLocation_1)
      this.toggler.add(function () {
        _this.drawer.content.append(_this.menu)
      }, function () {
        _this.drawer.close()
        orgLocation_1.after(_this.menu)
      })
    }
    return this.drawer
  }
  return MmenuLight
}())

/*!
 * Mmenu Light
 * mmenujs.com/mmenu-light
 *
 * Copyright (c) Fred Heusschen
 * www.frebsite.nl
 *
 * License: CC-BY-4.0
 * http://creativecommons.org/licenses/by/4.0/
 */ window.MmenuLight = MmenuLight

document.addEventListener('turbo:load', () => {
  const menu = new MmenuLight(document.querySelector('#mobileNav'), 'all')
  menu.navigation({
    selectedClass: 'Selected',
    slidingSubmenus: true,
    theme: 'light',
    title: 'Main Menu'
  })
  const drawer = menu.offcanvas({})
  document.querySelector('a[href="#mobileNav"]').addEventListener('click', evnt => {
    evnt.preventDefault()
    drawer.open()
  })
})

const runningOnBrowser = typeof window !== 'undefined'

const isBot = runningOnBrowser && !('onscroll' in window) || typeof navigator !== 'undefined' && /(gle|ing|ro)bot|crawl|spider/i.test(navigator.userAgent)

const supportsIntersectionObserver = runningOnBrowser && 'IntersectionObserver' in window

const supportsClassList = runningOnBrowser && 'classList' in document.createElement('p')

const isHiDpi = runningOnBrowser && window.devicePixelRatio > 1

const defaultSettings = {
  elements_selector: '.lazy',
  container: isBot || runningOnBrowser ? document : null,
  threshold: 300,
  thresholds: null,
  data_src: 'src',
  data_srcset: 'srcset',
  data_sizes: 'sizes',
  data_bg: 'bg',
  data_bg_hidpi: 'bg-hidpi',
  data_bg_multi: 'bg-multi',
  data_bg_multi_hidpi: 'bg-multi-hidpi',
  data_bg_set: 'bg-set',
  data_poster: 'poster',
  class_applied: 'applied',
  class_loading: 'loading',
  class_loaded: 'loaded',
  class_error: 'error',
  class_entered: 'entered',
  class_exited: 'exited',
  unobserve_completed: true,
  unobserve_entered: false,
  cancel_on_exit: true,
  callback_enter: null,
  callback_exit: null,
  callback_applied: null,
  callback_loading: null,
  callback_loaded: null,
  callback_error: null,
  callback_finish: null,
  callback_cancel: null,
  use_native: false,
  restore_on_error: false
}

const getExtendedSettings = customSettings => Object.assign({}, defaultSettings, customSettings)

const createInstance = function (classObj, options) {
  let event
  const eventString = 'LazyLoad::Initialized'
  const instance = new classObj(options)
  try {
    event = new CustomEvent(eventString, {
      detail: {
        instance
      }
    })
  } catch (err) {
    event = document.createEvent('CustomEvent')
    event.initCustomEvent(eventString, false, false, {
      instance
    })
  }
  window.dispatchEvent(event)
}

const autoInitialize = (classObj, options) => {
  if (!options) {
    return
  }
  if (!options.length) {
    createInstance(classObj, options)
  } else {
    for (let i = 0, optionsItem; optionsItem = options[i]; i += 1) {
      createInstance(classObj, optionsItem)
    }
  }
}

const SRC = 'src'

const SRCSET = 'srcset'

const SIZES = 'sizes'

const POSTER = 'poster'

const ORIGINALS = 'llOriginalAttrs'

const DATA = 'data'

const statusLoading = 'loading'

const statusLoaded = 'loaded'

const statusApplied = 'applied'

const statusEntered = 'entered'

const statusError = 'error'

const statusNative = 'native'

const dataPrefix = 'data-'

const statusDataName = 'll-status'

const getData = (element, attribute) => element.getAttribute(dataPrefix + attribute)

const setData = (element, attribute, value) => {
  const attrName = dataPrefix + attribute
  if (value === null) {
    element.removeAttribute(attrName)
    return
  }
  element.setAttribute(attrName, value)
}

const getStatus = element => getData(element, statusDataName)

const setStatus = (element, status) => setData(element, statusDataName, status)

const resetStatus = element => setStatus(element, null)

const hasEmptyStatus = element => getStatus(element) === null

const hasStatusLoading = element => getStatus(element) === statusLoading

const hasStatusError = element => getStatus(element) === statusError

const hasStatusNative = element => getStatus(element) === statusNative

const statusesAfterLoading = [statusLoading, statusLoaded, statusApplied, statusError]

const hadStartedLoading = element => statusesAfterLoading.indexOf(getStatus(element)) >= 0

const safeCallback = (callback, arg1, arg2, arg3) => {
  if (!callback) {
    return
  }
  if (arg3 !== undefined) {
    callback(arg1, arg2, arg3)
    return
  }
  if (arg2 !== undefined) {
    callback(arg1, arg2)
    return
  }
  callback(arg1)
}

const addClass = (element, className) => {
  if (supportsClassList) {
    element.classList.add(className)
    return
  }
  element.className += (element.className ? ' ' : '') + className
}

const removeClass = (element, className) => {
  if (supportsClassList) {
    element.classList.remove(className)
    return
  }
  element.className = element.className.replace(new RegExp('(^|\\s+)' + className + '(\\s+|$)'), ' ').replace(/^\s+/, '').replace(/\s+$/, '')
}

const addTempImage = element => {
  element.llTempImage = document.createElement('IMG')
}

const deleteTempImage = element => {
  delete element.llTempImage
}

const getTempImage = element => element.llTempImage

const unobserve = (element, instance) => {
  if (!instance) return
  const observer = instance._observer
  if (!observer) return
  observer.unobserve(element)
}

const resetObserver = observer => {
  observer.disconnect()
}

const unobserveEntered = (element, settings, instance) => {
  if (settings.unobserve_entered) unobserve(element, instance)
}

const updateLoadingCount = (instance, delta) => {
  if (!instance) return
  instance.loadingCount += delta
}

const decreaseToLoadCount = instance => {
  if (!instance) return
  instance.toLoadCount -= 1
}

const setToLoadCount = (instance, value) => {
  if (!instance) return
  instance.toLoadCount = value
}

const isSomethingLoading = instance => instance.loadingCount > 0

const haveElementsToLoad = instance => instance.toLoadCount > 0

const getSourceTags = parentTag => {
  const sourceTags = []
  for (let i = 0, childTag; childTag = parentTag.children[i]; i += 1) {
    if (childTag.tagName === 'SOURCE') {
      sourceTags.push(childTag)
    }
  }
  return sourceTags
}

const forEachPictureSource = (element, fn) => {
  const parent = element.parentNode
  if (!parent || parent.tagName !== 'PICTURE') {
    return
  }
  const sourceTags = getSourceTags(parent)
  sourceTags.forEach(fn)
}

const forEachVideoSource = (element, fn) => {
  const sourceTags = getSourceTags(element)
  sourceTags.forEach(fn)
}

const attrsSrc = [SRC]

const attrsSrcPoster = [SRC, POSTER]

const attrsSrcSrcsetSizes = [SRC, SRCSET, SIZES]

const attrsData = [DATA]

const hasOriginalAttrs = element => !!element[ORIGINALS]

const getOriginalAttrs = element => element[ORIGINALS]

const deleteOriginalAttrs = element => delete element[ORIGINALS]

const setOriginalsObject = (element, attributes) => {
  if (hasOriginalAttrs(element)) {
    return
  }
  const originals = {}
  attributes.forEach(attribute => {
    originals[attribute] = element.getAttribute(attribute)
  })
  element[ORIGINALS] = originals
}

const saveOriginalBackgroundStyle = element => {
  if (hasOriginalAttrs(element)) {
    return
  }
  element[ORIGINALS] = {
    backgroundImage: element.style.backgroundImage
  }
}

const setOrResetAttribute = (element, attrName, value) => {
  if (!value) {
    element.removeAttribute(attrName)
    return
  }
  element.setAttribute(attrName, value)
}

const restoreOriginalAttrs = (element, attributes) => {
  if (!hasOriginalAttrs(element)) {
    return
  }
  const originals = getOriginalAttrs(element)
  attributes.forEach(attribute => {
    setOrResetAttribute(element, attribute, originals[attribute])
  })
}

const restoreOriginalBgImage = element => {
  if (!hasOriginalAttrs(element)) {
    return
  }
  const originals = getOriginalAttrs(element)
  element.style.backgroundImage = originals.backgroundImage
}

const manageApplied = (element, settings, instance) => {
  addClass(element, settings.class_applied)
  setStatus(element, statusApplied)
  if (!instance) return
  if (settings.unobserve_completed) {
    unobserve(element, settings)
  }
  safeCallback(settings.callback_applied, element, instance)
}

const manageLoading = (element, settings, instance) => {
  addClass(element, settings.class_loading)
  setStatus(element, statusLoading)
  if (!instance) return
  updateLoadingCount(instance, +1)
  safeCallback(settings.callback_loading, element, instance)
}

const setAttributeIfValue = (element, attrName, value) => {
  if (!value) {
    return
  }
  element.setAttribute(attrName, value)
}

const setImageAttributes = (element, settings) => {
  setAttributeIfValue(element, SIZES, getData(element, settings.data_sizes))
  setAttributeIfValue(element, SRCSET, getData(element, settings.data_srcset))
  setAttributeIfValue(element, SRC, getData(element, settings.data_src))
}

const setSourcesImg = (imgEl, settings) => {
  forEachPictureSource(imgEl, sourceTag => {
    setOriginalsObject(sourceTag, attrsSrcSrcsetSizes)
    setImageAttributes(sourceTag, settings)
  })
  setOriginalsObject(imgEl, attrsSrcSrcsetSizes)
  setImageAttributes(imgEl, settings)
}

const setSourcesIframe = (iframe, settings) => {
  setOriginalsObject(iframe, attrsSrc)
  setAttributeIfValue(iframe, SRC, getData(iframe, settings.data_src))
}

const setSourcesVideo = (videoEl, settings) => {
  forEachVideoSource(videoEl, sourceEl => {
    setOriginalsObject(sourceEl, attrsSrc)
    setAttributeIfValue(sourceEl, SRC, getData(sourceEl, settings.data_src))
  })
  setOriginalsObject(videoEl, attrsSrcPoster)
  setAttributeIfValue(videoEl, POSTER, getData(videoEl, settings.data_poster))
  setAttributeIfValue(videoEl, SRC, getData(videoEl, settings.data_src))
  videoEl.load()
}

const setSourcesObject = (object, settings) => {
  setOriginalsObject(object, attrsData)
  setAttributeIfValue(object, DATA, getData(object, settings.data_src))
}

const setBackground = (element, settings, instance) => {
  const bg1xValue = getData(element, settings.data_bg)
  const bgHiDpiValue = getData(element, settings.data_bg_hidpi)
  const bgDataValue = isHiDpi && bgHiDpiValue ? bgHiDpiValue : bg1xValue
  if (!bgDataValue) return
  element.style.backgroundImage = `url("${bgDataValue}")`
  getTempImage(element).setAttribute(SRC, bgDataValue)
  manageLoading(element, settings, instance)
}

const setMultiBackground = (element, settings, instance) => {
  const bg1xValue = getData(element, settings.data_bg_multi)
  const bgHiDpiValue = getData(element, settings.data_bg_multi_hidpi)
  const bgDataValue = isHiDpi && bgHiDpiValue ? bgHiDpiValue : bg1xValue
  if (!bgDataValue) {
    return
  }
  element.style.backgroundImage = bgDataValue
  manageApplied(element, settings, instance)
}

const setImgsetBackground = (element, settings, instance) => {
  const bgImgSetDataValue = getData(element, settings.data_bg_set)
  if (!bgImgSetDataValue) {
    return
  }
  const imgSetValues = bgImgSetDataValue.split('|')
  let bgImageValues = imgSetValues.map(value => `image-set(${value})`)
  element.style.backgroundImage = bgImageValues.join()
  if (element.style.backgroundImage === '') {
    bgImageValues = imgSetValues.map(value => `-webkit-image-set(${value})`)
    element.style.backgroundImage = bgImageValues.join()
  }
  manageApplied(element, settings, instance)
}

const setSourcesFunctions = {
  IMG: setSourcesImg,
  IFRAME: setSourcesIframe,
  VIDEO: setSourcesVideo,
  OBJECT: setSourcesObject
}

const setSourcesNative = (element, settings) => {
  const setSourcesFunction = setSourcesFunctions[element.tagName]
  if (!setSourcesFunction) {
    return
  }
  setSourcesFunction(element, settings)
}

const setSources = (element, settings, instance) => {
  const setSourcesFunction = setSourcesFunctions[element.tagName]
  if (!setSourcesFunction) {
    return
  }
  setSourcesFunction(element, settings)
  manageLoading(element, settings, instance)
}

const elementsWithLoadEvent = ['IMG', 'IFRAME', 'VIDEO', 'OBJECT']

const hasLoadEvent = element => elementsWithLoadEvent.indexOf(element.tagName) > -1

const checkFinish = (settings, instance) => {
  if (instance && !isSomethingLoading(instance) && !haveElementsToLoad(instance)) {
    safeCallback(settings.callback_finish, instance)
  }
}

const addEventListener$1 = (element, eventName, handler) => {
  element.addEventListener(eventName, handler)
  element.llEvLisnrs[eventName] = handler
}

const removeEventListener$1 = (element, eventName, handler) => {
  element.removeEventListener(eventName, handler)
}

const hasEventListeners = element => !!element.llEvLisnrs

const addEventListeners = (element, loadHandler, errorHandler) => {
  if (!hasEventListeners(element)) element.llEvLisnrs = {}
  const loadEventName = element.tagName === 'VIDEO' ? 'loadeddata' : 'load'
  addEventListener$1(element, loadEventName, loadHandler)
  addEventListener$1(element, 'error', errorHandler)
}

const removeEventListeners = element => {
  if (!hasEventListeners(element)) {
    return
  }
  const eventListeners = element.llEvLisnrs
  for (const eventName in eventListeners) {
    const handler = eventListeners[eventName]
    removeEventListener$1(element, eventName, handler)
  }
  delete element.llEvLisnrs
}

const doneHandler = (element, settings, instance) => {
  deleteTempImage(element)
  updateLoadingCount(instance, -1)
  decreaseToLoadCount(instance)
  removeClass(element, settings.class_loading)
  if (settings.unobserve_completed) {
    unobserve(element, instance)
  }
}

const loadHandler = (event, element, settings, instance) => {
  const goingNative = hasStatusNative(element)
  doneHandler(element, settings, instance)
  addClass(element, settings.class_loaded)
  setStatus(element, statusLoaded)
  safeCallback(settings.callback_loaded, element, instance)
  if (!goingNative) checkFinish(settings, instance)
}

const errorHandler = (event, element, settings, instance) => {
  const goingNative = hasStatusNative(element)
  doneHandler(element, settings, instance)
  addClass(element, settings.class_error)
  setStatus(element, statusError)
  safeCallback(settings.callback_error, element, instance)
  if (settings.restore_on_error) restoreOriginalAttrs(element, attrsSrcSrcsetSizes)
  if (!goingNative) checkFinish(settings, instance)
}

const addOneShotEventListeners = (element, settings, instance) => {
  const elementToListenTo = getTempImage(element) || element
  if (hasEventListeners(elementToListenTo)) {
    return
  }
  const _loadHandler = event => {
    loadHandler(event, element, settings, instance)
    removeEventListeners(elementToListenTo)
  }
  const _errorHandler = event => {
    errorHandler(event, element, settings, instance)
    removeEventListeners(elementToListenTo)
  }
  addEventListeners(elementToListenTo, _loadHandler, _errorHandler)
}

const loadBackground = (element, settings, instance) => {
  addTempImage(element)
  addOneShotEventListeners(element, settings, instance)
  saveOriginalBackgroundStyle(element)
  setBackground(element, settings, instance)
  setMultiBackground(element, settings, instance)
  setImgsetBackground(element, settings, instance)
}

const loadRegular = (element, settings, instance) => {
  addOneShotEventListeners(element, settings, instance)
  setSources(element, settings, instance)
}

const load = (element, settings, instance) => {
  if (hasLoadEvent(element)) {
    loadRegular(element, settings, instance)
  } else {
    loadBackground(element, settings, instance)
  }
}

const loadNative = (element, settings, instance) => {
  element.setAttribute('loading', 'lazy')
  addOneShotEventListeners(element, settings, instance)
  setSourcesNative(element, settings)
  setStatus(element, statusNative)
}

const removeImageAttributes = element => {
  element.removeAttribute(SRC)
  element.removeAttribute(SRCSET)
  element.removeAttribute(SIZES)
}

const resetSourcesImg = element => {
  forEachPictureSource(element, sourceTag => {
    removeImageAttributes(sourceTag)
  })
  removeImageAttributes(element)
}

const restoreImg = imgEl => {
  forEachPictureSource(imgEl, sourceEl => {
    restoreOriginalAttrs(sourceEl, attrsSrcSrcsetSizes)
  })
  restoreOriginalAttrs(imgEl, attrsSrcSrcsetSizes)
}

const restoreVideo = videoEl => {
  forEachVideoSource(videoEl, sourceEl => {
    restoreOriginalAttrs(sourceEl, attrsSrc)
  })
  restoreOriginalAttrs(videoEl, attrsSrcPoster)
  videoEl.load()
}

const restoreIframe = iframeEl => {
  restoreOriginalAttrs(iframeEl, attrsSrc)
}

const restoreObject = objectEl => {
  restoreOriginalAttrs(objectEl, attrsData)
}

const restoreFunctions = {
  IMG: restoreImg,
  IFRAME: restoreIframe,
  VIDEO: restoreVideo,
  OBJECT: restoreObject
}

const restoreAttributes = element => {
  const restoreFunction = restoreFunctions[element.tagName]
  if (!restoreFunction) {
    restoreOriginalBgImage(element)
    return
  }
  restoreFunction(element)
}

const resetClasses = (element, settings) => {
  if (hasEmptyStatus(element) || hasStatusNative(element)) {
    return
  }
  removeClass(element, settings.class_entered)
  removeClass(element, settings.class_exited)
  removeClass(element, settings.class_applied)
  removeClass(element, settings.class_loading)
  removeClass(element, settings.class_loaded)
  removeClass(element, settings.class_error)
}

const restore = (element, settings) => {
  restoreAttributes(element)
  resetClasses(element, settings)
  resetStatus(element)
  deleteOriginalAttrs(element)
}

const cancelLoading = (element, entry, settings, instance) => {
  if (!settings.cancel_on_exit) return
  if (!hasStatusLoading(element)) return
  if (element.tagName !== 'IMG') return
  removeEventListeners(element)
  resetSourcesImg(element)
  restoreImg(element)
  removeClass(element, settings.class_loading)
  updateLoadingCount(instance, -1)
  resetStatus(element)
  safeCallback(settings.callback_cancel, element, entry, instance)
}

const onEnter = (element, entry, settings, instance) => {
  const dontLoad = hadStartedLoading(element)
  setStatus(element, statusEntered)
  addClass(element, settings.class_entered)
  removeClass(element, settings.class_exited)
  unobserveEntered(element, settings, instance)
  safeCallback(settings.callback_enter, element, entry, instance)
  if (dontLoad) return
  load(element, settings, instance)
}

const onExit = (element, entry, settings, instance) => {
  if (hasEmptyStatus(element)) return
  addClass(element, settings.class_exited)
  cancelLoading(element, entry, settings, instance)
  safeCallback(settings.callback_exit, element, entry, instance)
}

const tagsWithNativeLazy = ['IMG', 'IFRAME', 'VIDEO']

const shouldUseNative = settings => settings.use_native && 'loading' in HTMLImageElement.prototype

const loadAllNative = (elements, settings, instance) => {
  elements.forEach(element => {
    if (tagsWithNativeLazy.indexOf(element.tagName) === -1) {
      return
    }
    loadNative(element, settings, instance)
  })
  setToLoadCount(instance, 0)
}

const isIntersecting = entry => entry.isIntersecting || entry.intersectionRatio > 0

const getObserverSettings = settings => ({
  root: settings.container === document ? null : settings.container,
  rootMargin: settings.thresholds || settings.threshold + 'px'
})

const intersectionHandler = (entries, settings, instance) => {
  entries.forEach(entry => isIntersecting(entry) ? onEnter(entry.target, entry, settings, instance) : onExit(entry.target, entry, settings, instance))
}

const observeElements = (observer, elements) => {
  elements.forEach(element => {
    observer.observe(element)
  })
}

const updateObserver = (observer, elementsToObserve) => {
  resetObserver(observer)
  observeElements(observer, elementsToObserve)
}

const setObserver = (settings, instance) => {
  if (!supportsIntersectionObserver || shouldUseNative(settings)) {
    return
  }
  instance._observer = new IntersectionObserver(entries => {
    intersectionHandler(entries, settings, instance)
  }, getObserverSettings(settings))
}

const toArray = nodeSet => Array.prototype.slice.call(nodeSet)

const queryElements = settings => settings.container.querySelectorAll(settings.elements_selector)

const excludeManagedElements = elements => toArray(elements).filter(hasEmptyStatus)

const hasError = element => hasStatusError(element)

const filterErrorElements = elements => toArray(elements).filter(hasError)

const getElementsToLoad = (elements, settings) => excludeManagedElements(elements || queryElements(settings))

const retryLazyLoad = (settings, instance) => {
  const errorElements = filterErrorElements(queryElements(settings))
  errorElements.forEach(element => {
    removeClass(element, settings.class_error)
    resetStatus(element)
  })
  instance.update()
}

const setOnlineCheck = (settings, instance) => {
  if (!runningOnBrowser) {
    return
  }
  instance._onlineHandler = () => {
    retryLazyLoad(settings, instance)
  }
  window.addEventListener('online', instance._onlineHandler)
}

const resetOnlineCheck = instance => {
  if (!runningOnBrowser) {
    return
  }
  window.removeEventListener('online', instance._onlineHandler)
}

const LazyLoad = function (customSettings, elements) {
  const settings = getExtendedSettings(customSettings)
  this._settings = settings
  this.loadingCount = 0
  setObserver(settings, this)
  setOnlineCheck(settings, this)
  this.update(elements)
}

LazyLoad.prototype = {
  update: function (givenNodeset) {
    const settings = this._settings
    const elementsToLoad = getElementsToLoad(givenNodeset, settings)
    setToLoadCount(this, elementsToLoad.length)
    if (isBot || !supportsIntersectionObserver) {
      this.loadAll(elementsToLoad)
      return
    }
    if (shouldUseNative(settings)) {
      loadAllNative(elementsToLoad, settings, this)
      return
    }
    updateObserver(this._observer, elementsToLoad)
  },
  destroy: function () {
    if (this._observer) {
      this._observer.disconnect()
    }
    resetOnlineCheck(this)
    queryElements(this._settings).forEach(element => {
      deleteOriginalAttrs(element)
    })
    delete this._observer
    delete this._settings
    delete this._onlineHandler
    delete this.loadingCount
    delete this.toLoadCount
  },
  loadAll: function (elements) {
    const settings = this._settings
    const elementsToLoad = getElementsToLoad(elements, settings)
    elementsToLoad.forEach(element => {
      unobserve(element, this)
      load(element, settings, this)
    })
  },
  restoreAll: function () {
    const settings = this._settings
    queryElements(settings).forEach(element => {
      restore(element, settings)
    })
  }
}

LazyLoad.load = (element, customSettings) => {
  const settings = getExtendedSettings(customSettings)
  load(element, settings)
}

LazyLoad.resetStatus = element => {
  resetStatus(element)
}

if (runningOnBrowser) {
  autoInitialize(LazyLoad, window.lazyLoadOptions)
}

if (!window.LazyLoad) {
  window.LazyLoad = LazyLoad
}

class EventListener {
  constructor (eventTarget, eventName, eventOptions) {
    this.eventTarget = eventTarget
    this.eventName = eventName
    this.eventOptions = eventOptions
    this.unorderedBindings = new Set()
  }

  connect () {
    this.eventTarget.addEventListener(this.eventName, this, this.eventOptions)
  }

  disconnect () {
    this.eventTarget.removeEventListener(this.eventName, this, this.eventOptions)
  }

  bindingConnected (binding) {
    this.unorderedBindings.add(binding)
  }

  bindingDisconnected (binding) {
    this.unorderedBindings.delete(binding)
  }

  handleEvent (event) {
    const extendedEvent = extendEvent(event)
    for (const binding of this.bindings) {
      if (extendedEvent.immediatePropagationStopped) {
        break
      } else {
        binding.handleEvent(extendedEvent)
      }
    }
  }

  hasBindings () {
    return this.unorderedBindings.size > 0
  }

  get bindings () {
    return Array.from(this.unorderedBindings).sort((left, right) => {
      const leftIndex = left.index; const rightIndex = right.index
      return leftIndex < rightIndex ? -1 : leftIndex > rightIndex ? 1 : 0
    })
  }
}

function extendEvent (event) {
  if ('immediatePropagationStopped' in event) {
    return event
  } else {
    const { stopImmediatePropagation } = event
    return Object.assign(event, {
      immediatePropagationStopped: false,
      stopImmediatePropagation () {
        this.immediatePropagationStopped = true
        stopImmediatePropagation.call(this)
      }
    })
  }
}

class Dispatcher {
  constructor (application) {
    this.application = application
    this.eventListenerMaps = new Map()
    this.started = false
  }

  start () {
    if (!this.started) {
      this.started = true
      this.eventListeners.forEach(eventListener => eventListener.connect())
    }
  }

  stop () {
    if (this.started) {
      this.started = false
      this.eventListeners.forEach(eventListener => eventListener.disconnect())
    }
  }

  get eventListeners () {
    return Array.from(this.eventListenerMaps.values()).reduce((listeners, map) => listeners.concat(Array.from(map.values())), [])
  }

  bindingConnected (binding) {
    this.fetchEventListenerForBinding(binding).bindingConnected(binding)
  }

  bindingDisconnected (binding, clearEventListeners = false) {
    this.fetchEventListenerForBinding(binding).bindingDisconnected(binding)
    if (clearEventListeners) this.clearEventListenersForBinding(binding)
  }

  handleError (error, message, detail = {}) {
    this.application.handleError(error, `Error ${message}`, detail)
  }

  clearEventListenersForBinding (binding) {
    const eventListener = this.fetchEventListenerForBinding(binding)
    if (!eventListener.hasBindings()) {
      eventListener.disconnect()
      this.removeMappedEventListenerFor(binding)
    }
  }

  removeMappedEventListenerFor (binding) {
    const { eventTarget, eventName, eventOptions } = binding
    const eventListenerMap = this.fetchEventListenerMapForEventTarget(eventTarget)
    const cacheKey = this.cacheKey(eventName, eventOptions)
    eventListenerMap.delete(cacheKey)
    if (eventListenerMap.size == 0) this.eventListenerMaps.delete(eventTarget)
  }

  fetchEventListenerForBinding (binding) {
    const { eventTarget, eventName, eventOptions } = binding
    return this.fetchEventListener(eventTarget, eventName, eventOptions)
  }

  fetchEventListener (eventTarget, eventName, eventOptions) {
    const eventListenerMap = this.fetchEventListenerMapForEventTarget(eventTarget)
    const cacheKey = this.cacheKey(eventName, eventOptions)
    let eventListener = eventListenerMap.get(cacheKey)
    if (!eventListener) {
      eventListener = this.createEventListener(eventTarget, eventName, eventOptions)
      eventListenerMap.set(cacheKey, eventListener)
    }
    return eventListener
  }

  createEventListener (eventTarget, eventName, eventOptions) {
    const eventListener = new EventListener(eventTarget, eventName, eventOptions)
    if (this.started) {
      eventListener.connect()
    }
    return eventListener
  }

  fetchEventListenerMapForEventTarget (eventTarget) {
    let eventListenerMap = this.eventListenerMaps.get(eventTarget)
    if (!eventListenerMap) {
      eventListenerMap = new Map()
      this.eventListenerMaps.set(eventTarget, eventListenerMap)
    }
    return eventListenerMap
  }

  cacheKey (eventName, eventOptions) {
    const parts = [eventName]
    Object.keys(eventOptions).sort().forEach(key => {
      parts.push(`${eventOptions[key] ? '' : '!'}${key}`)
    })
    return parts.join(':')
  }
}

const defaultActionDescriptorFilters = {
  stop ({ event, value }) {
    if (value) event.stopPropagation()
    return true
  },
  prevent ({ event, value }) {
    if (value) event.preventDefault()
    return true
  },
  self ({ event, value, element }) {
    if (value) {
      return element === event.target
    } else {
      return true
    }
  }
}

const descriptorPattern = /^(?:(.+?)(?:\.(.+?))?(?:@(window|document))?->)?(.+?)(?:#([^:]+?))(?::(.+))?$/

function parseActionDescriptorString (descriptorString) {
  const source = descriptorString.trim()
  const matches = source.match(descriptorPattern) || []
  let eventName = matches[1]
  let keyFilter = matches[2]
  if (keyFilter && !['keydown', 'keyup', 'keypress'].includes(eventName)) {
    eventName += `.${keyFilter}`
    keyFilter = ''
  }
  return {
    eventTarget: parseEventTarget(matches[3]),
    eventName,
    eventOptions: matches[6] ? parseEventOptions(matches[6]) : {},
    identifier: matches[4],
    methodName: matches[5],
    keyFilter
  }
}

function parseEventTarget (eventTargetName) {
  if (eventTargetName == 'window') {
    return window
  } else if (eventTargetName == 'document') {
    return document
  }
}

function parseEventOptions (eventOptions) {
  return eventOptions.split(':').reduce((options, token) => Object.assign(options, {
    [token.replace(/^!/, '')]: !/^!/.test(token)
  }), {})
}

function stringifyEventTarget (eventTarget) {
  if (eventTarget == window) {
    return 'window'
  } else if (eventTarget == document) {
    return 'document'
  }
}

function camelize (value) {
  return value.replace(/(?:[_-])([a-z0-9])/g, (_, char) => char.toUpperCase())
}

function namespaceCamelize (value) {
  return camelize(value.replace(/--/g, '-').replace(/__/g, '_'))
}

function capitalize (value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function dasherize (value) {
  return value.replace(/([A-Z])/g, (_, char) => `-${char.toLowerCase()}`)
}

function tokenize (value) {
  return value.match(/[^\s]+/g) || []
}

class Action {
  constructor (element, index, descriptor, schema) {
    this.element = element
    this.index = index
    this.eventTarget = descriptor.eventTarget || element
    this.eventName = descriptor.eventName || getDefaultEventNameForElement(element) || error('missing event name')
    this.eventOptions = descriptor.eventOptions || {}
    this.identifier = descriptor.identifier || error('missing identifier')
    this.methodName = descriptor.methodName || error('missing method name')
    this.keyFilter = descriptor.keyFilter || ''
    this.schema = schema
  }

  static forToken (token, schema) {
    return new this(token.element, token.index, parseActionDescriptorString(token.content), schema)
  }

  toString () {
    const eventFilter = this.keyFilter ? `.${this.keyFilter}` : ''
    const eventTarget = this.eventTargetName ? `@${this.eventTargetName}` : ''
    return `${this.eventName}${eventFilter}${eventTarget}->${this.identifier}#${this.methodName}`
  }

  isFilterTarget (event) {
    if (!this.keyFilter) {
      return false
    }
    const filteres = this.keyFilter.split('+')
    const modifiers = ['meta', 'ctrl', 'alt', 'shift']
    const [meta, ctrl, alt, shift] = modifiers.map(modifier => filteres.includes(modifier))
    if (event.metaKey !== meta || event.ctrlKey !== ctrl || event.altKey !== alt || event.shiftKey !== shift) {
      return true
    }
    const standardFilter = filteres.filter(key => !modifiers.includes(key))[0]
    if (!standardFilter) {
      return false
    }
    if (!Object.prototype.hasOwnProperty.call(this.keyMappings, standardFilter)) {
      error(`contains unknown key filter: ${this.keyFilter}`)
    }
    return this.keyMappings[standardFilter].toLowerCase() !== event.key.toLowerCase()
  }

  get params () {
    const params = {}
    const pattern = new RegExp(`^data-${this.identifier}-(.+)-param$`, 'i')
    for (const { name, value } of Array.from(this.element.attributes)) {
      const match = name.match(pattern)
      const key = match && match[1]
      if (key) {
        params[camelize(key)] = typecast(value)
      }
    }
    return params
  }

  get eventTargetName () {
    return stringifyEventTarget(this.eventTarget)
  }

  get keyMappings () {
    return this.schema.keyMappings
  }
}

const defaultEventNames = {
  a: () => 'click',
  button: () => 'click',
  form: () => 'submit',
  details: () => 'toggle',
  input: e => e.getAttribute('type') == 'submit' ? 'click' : 'input',
  select: () => 'change',
  textarea: () => 'input'
}

function getDefaultEventNameForElement (element) {
  const tagName = element.tagName.toLowerCase()
  if (tagName in defaultEventNames) {
    return defaultEventNames[tagName](element)
  }
}

function error (message) {
  throw new Error(message)
}

function typecast (value) {
  try {
    return JSON.parse(value)
  } catch (o_O) {
    return value
  }
}

class Binding {
  constructor (context, action) {
    this.context = context
    this.action = action
  }

  get index () {
    return this.action.index
  }

  get eventTarget () {
    return this.action.eventTarget
  }

  get eventOptions () {
    return this.action.eventOptions
  }

  get identifier () {
    return this.context.identifier
  }

  handleEvent (event) {
    if (this.willBeInvokedByEvent(event) && this.applyEventModifiers(event)) {
      this.invokeWithEvent(event)
    }
  }

  get eventName () {
    return this.action.eventName
  }

  get method () {
    const method = this.controller[this.methodName]
    if (typeof method === 'function') {
      return method
    }
    throw new Error(`Action "${this.action}" references undefined method "${this.methodName}"`)
  }

  applyEventModifiers (event) {
    const { element } = this.action
    const { actionDescriptorFilters } = this.context.application
    let passes = true
    for (const [name, value] of Object.entries(this.eventOptions)) {
      if (name in actionDescriptorFilters) {
        const filter = actionDescriptorFilters[name]
        passes = passes && filter({
          name,
          value,
          event,
          element
        })
      } else {
        continue
      }
    }
    return passes
  }

  invokeWithEvent (event) {
    const { target, currentTarget } = event
    try {
      const { params } = this.action
      const actionEvent = Object.assign(event, {
        params
      })
      this.method.call(this.controller, actionEvent)
      this.context.logDebugActivity(this.methodName, {
        event,
        target,
        currentTarget,
        action: this.methodName
      })
    } catch (error) {
      const { identifier, controller, element, index } = this
      const detail = {
        identifier,
        controller,
        element,
        index,
        event
      }
      this.context.handleError(error, `invoking action "${this.action}"`, detail)
    }
  }

  willBeInvokedByEvent (event) {
    const eventTarget = event.target
    if (event instanceof KeyboardEvent && this.action.isFilterTarget(event)) {
      return false
    }
    if (this.element === eventTarget) {
      return true
    } else if (eventTarget instanceof Element && this.element.contains(eventTarget)) {
      return this.scope.containsElement(eventTarget)
    } else {
      return this.scope.containsElement(this.action.element)
    }
  }

  get controller () {
    return this.context.controller
  }

  get methodName () {
    return this.action.methodName
  }

  get element () {
    return this.scope.element
  }

  get scope () {
    return this.context.scope
  }
}

class ElementObserver {
  constructor (element, delegate) {
    this.mutationObserverInit = {
      attributes: true,
      childList: true,
      subtree: true
    }
    this.element = element
    this.started = false
    this.delegate = delegate
    this.elements = new Set()
    this.mutationObserver = new MutationObserver(mutations => this.processMutations(mutations))
  }

  start () {
    if (!this.started) {
      this.started = true
      this.mutationObserver.observe(this.element, this.mutationObserverInit)
      this.refresh()
    }
  }

  pause (callback) {
    if (this.started) {
      this.mutationObserver.disconnect()
      this.started = false
    }
    callback()
    if (!this.started) {
      this.mutationObserver.observe(this.element, this.mutationObserverInit)
      this.started = true
    }
  }

  stop () {
    if (this.started) {
      this.mutationObserver.takeRecords()
      this.mutationObserver.disconnect()
      this.started = false
    }
  }

  refresh () {
    if (this.started) {
      const matches = new Set(this.matchElementsInTree())
      for (const element of Array.from(this.elements)) {
        if (!matches.has(element)) {
          this.removeElement(element)
        }
      }
      for (const element of Array.from(matches)) {
        this.addElement(element)
      }
    }
  }

  processMutations (mutations) {
    if (this.started) {
      for (const mutation of mutations) {
        this.processMutation(mutation)
      }
    }
  }

  processMutation (mutation) {
    if (mutation.type == 'attributes') {
      this.processAttributeChange(mutation.target, mutation.attributeName)
    } else if (mutation.type == 'childList') {
      this.processRemovedNodes(mutation.removedNodes)
      this.processAddedNodes(mutation.addedNodes)
    }
  }

  processAttributeChange (node, attributeName) {
    const element = node
    if (this.elements.has(element)) {
      if (this.delegate.elementAttributeChanged && this.matchElement(element)) {
        this.delegate.elementAttributeChanged(element, attributeName)
      } else {
        this.removeElement(element)
      }
    } else if (this.matchElement(element)) {
      this.addElement(element)
    }
  }

  processRemovedNodes (nodes) {
    for (const node of Array.from(nodes)) {
      const element = this.elementFromNode(node)
      if (element) {
        this.processTree(element, this.removeElement)
      }
    }
  }

  processAddedNodes (nodes) {
    for (const node of Array.from(nodes)) {
      const element = this.elementFromNode(node)
      if (element && this.elementIsActive(element)) {
        this.processTree(element, this.addElement)
      }
    }
  }

  matchElement (element) {
    return this.delegate.matchElement(element)
  }

  matchElementsInTree (tree = this.element) {
    return this.delegate.matchElementsInTree(tree)
  }

  processTree (tree, processor) {
    for (const element of this.matchElementsInTree(tree)) {
      processor.call(this, element)
    }
  }

  elementFromNode (node) {
    if (node.nodeType == Node.ELEMENT_NODE) {
      return node
    }
  }

  elementIsActive (element) {
    if (element.isConnected != this.element.isConnected) {
      return false
    } else {
      return this.element.contains(element)
    }
  }

  addElement (element) {
    if (!this.elements.has(element)) {
      if (this.elementIsActive(element)) {
        this.elements.add(element)
        if (this.delegate.elementMatched) {
          this.delegate.elementMatched(element)
        }
      }
    }
  }

  removeElement (element) {
    if (this.elements.has(element)) {
      this.elements.delete(element)
      if (this.delegate.elementUnmatched) {
        this.delegate.elementUnmatched(element)
      }
    }
  }
}

class AttributeObserver {
  constructor (element, attributeName, delegate) {
    this.attributeName = attributeName
    this.delegate = delegate
    this.elementObserver = new ElementObserver(element, this)
  }

  get element () {
    return this.elementObserver.element
  }

  get selector () {
    return `[${this.attributeName}]`
  }

  start () {
    this.elementObserver.start()
  }

  pause (callback) {
    this.elementObserver.pause(callback)
  }

  stop () {
    this.elementObserver.stop()
  }

  refresh () {
    this.elementObserver.refresh()
  }

  get started () {
    return this.elementObserver.started
  }

  matchElement (element) {
    return element.hasAttribute(this.attributeName)
  }

  matchElementsInTree (tree) {
    const match = this.matchElement(tree) ? [tree] : []
    const matches = Array.from(tree.querySelectorAll(this.selector))
    return match.concat(matches)
  }

  elementMatched (element) {
    if (this.delegate.elementMatchedAttribute) {
      this.delegate.elementMatchedAttribute(element, this.attributeName)
    }
  }

  elementUnmatched (element) {
    if (this.delegate.elementUnmatchedAttribute) {
      this.delegate.elementUnmatchedAttribute(element, this.attributeName)
    }
  }

  elementAttributeChanged (element, attributeName) {
    if (this.delegate.elementAttributeValueChanged && this.attributeName == attributeName) {
      this.delegate.elementAttributeValueChanged(element, attributeName)
    }
  }
}

function add (map, key, value) {
  fetch$1(map, key).add(value)
}

function del (map, key, value) {
  fetch$1(map, key).delete(value)
  prune(map, key)
}

function fetch$1 (map, key) {
  let values = map.get(key)
  if (!values) {
    values = new Set()
    map.set(key, values)
  }
  return values
}

function prune (map, key) {
  const values = map.get(key)
  if (values != null && values.size == 0) {
    map.delete(key)
  }
}

class Multimap {
  constructor () {
    this.valuesByKey = new Map()
  }

  get keys () {
    return Array.from(this.valuesByKey.keys())
  }

  get values () {
    const sets = Array.from(this.valuesByKey.values())
    return sets.reduce((values, set) => values.concat(Array.from(set)), [])
  }

  get size () {
    const sets = Array.from(this.valuesByKey.values())
    return sets.reduce((size, set) => size + set.size, 0)
  }

  add (key, value) {
    add(this.valuesByKey, key, value)
  }

  delete (key, value) {
    del(this.valuesByKey, key, value)
  }

  has (key, value) {
    const values = this.valuesByKey.get(key)
    return values != null && values.has(value)
  }

  hasKey (key) {
    return this.valuesByKey.has(key)
  }

  hasValue (value) {
    const sets = Array.from(this.valuesByKey.values())
    return sets.some(set => set.has(value))
  }

  getValuesForKey (key) {
    const values = this.valuesByKey.get(key)
    return values ? Array.from(values) : []
  }

  getKeysForValue (value) {
    return Array.from(this.valuesByKey).filter(([_key, values]) => values.has(value)).map(([key, _values]) => key)
  }
}

class SelectorObserver {
  constructor (element, selector, delegate, details = {}) {
    this.selector = selector
    this.details = details
    this.elementObserver = new ElementObserver(element, this)
    this.delegate = delegate
    this.matchesByElement = new Multimap()
  }

  get started () {
    return this.elementObserver.started
  }

  start () {
    this.elementObserver.start()
  }

  pause (callback) {
    this.elementObserver.pause(callback)
  }

  stop () {
    this.elementObserver.stop()
  }

  refresh () {
    this.elementObserver.refresh()
  }

  get element () {
    return this.elementObserver.element
  }

  matchElement (element) {
    const matches = element.matches(this.selector)
    if (this.delegate.selectorMatchElement) {
      return matches && this.delegate.selectorMatchElement(element, this.details)
    }
    return matches
  }

  matchElementsInTree (tree) {
    const match = this.matchElement(tree) ? [tree] : []
    const matches = Array.from(tree.querySelectorAll(this.selector)).filter(match => this.matchElement(match))
    return match.concat(matches)
  }

  elementMatched (element) {
    this.selectorMatched(element)
  }

  elementUnmatched (element) {
    this.selectorUnmatched(element)
  }

  elementAttributeChanged (element, _attributeName) {
    const matches = this.matchElement(element)
    const matchedBefore = this.matchesByElement.has(this.selector, element)
    if (!matches && matchedBefore) {
      this.selectorUnmatched(element)
    }
  }

  selectorMatched (element) {
    if (this.delegate.selectorMatched) {
      this.delegate.selectorMatched(element, this.selector, this.details)
      this.matchesByElement.add(this.selector, element)
    }
  }

  selectorUnmatched (element) {
    this.delegate.selectorUnmatched(element, this.selector, this.details)
    this.matchesByElement.delete(this.selector, element)
  }
}

class StringMapObserver {
  constructor (element, delegate) {
    this.element = element
    this.delegate = delegate
    this.started = false
    this.stringMap = new Map()
    this.mutationObserver = new MutationObserver(mutations => this.processMutations(mutations))
  }

  start () {
    if (!this.started) {
      this.started = true
      this.mutationObserver.observe(this.element, {
        attributes: true,
        attributeOldValue: true
      })
      this.refresh()
    }
  }

  stop () {
    if (this.started) {
      this.mutationObserver.takeRecords()
      this.mutationObserver.disconnect()
      this.started = false
    }
  }

  refresh () {
    if (this.started) {
      for (const attributeName of this.knownAttributeNames) {
        this.refreshAttribute(attributeName, null)
      }
    }
  }

  processMutations (mutations) {
    if (this.started) {
      for (const mutation of mutations) {
        this.processMutation(mutation)
      }
    }
  }

  processMutation (mutation) {
    const attributeName = mutation.attributeName
    if (attributeName) {
      this.refreshAttribute(attributeName, mutation.oldValue)
    }
  }

  refreshAttribute (attributeName, oldValue) {
    const key = this.delegate.getStringMapKeyForAttribute(attributeName)
    if (key != null) {
      if (!this.stringMap.has(attributeName)) {
        this.stringMapKeyAdded(key, attributeName)
      }
      const value = this.element.getAttribute(attributeName)
      if (this.stringMap.get(attributeName) != value) {
        this.stringMapValueChanged(value, key, oldValue)
      }
      if (value == null) {
        const oldValue = this.stringMap.get(attributeName)
        this.stringMap.delete(attributeName)
        if (oldValue) this.stringMapKeyRemoved(key, attributeName, oldValue)
      } else {
        this.stringMap.set(attributeName, value)
      }
    }
  }

  stringMapKeyAdded (key, attributeName) {
    if (this.delegate.stringMapKeyAdded) {
      this.delegate.stringMapKeyAdded(key, attributeName)
    }
  }

  stringMapValueChanged (value, key, oldValue) {
    if (this.delegate.stringMapValueChanged) {
      this.delegate.stringMapValueChanged(value, key, oldValue)
    }
  }

  stringMapKeyRemoved (key, attributeName, oldValue) {
    if (this.delegate.stringMapKeyRemoved) {
      this.delegate.stringMapKeyRemoved(key, attributeName, oldValue)
    }
  }

  get knownAttributeNames () {
    return Array.from(new Set(this.currentAttributeNames.concat(this.recordedAttributeNames)))
  }

  get currentAttributeNames () {
    return Array.from(this.element.attributes).map(attribute => attribute.name)
  }

  get recordedAttributeNames () {
    return Array.from(this.stringMap.keys())
  }
}

class TokenListObserver {
  constructor (element, attributeName, delegate) {
    this.attributeObserver = new AttributeObserver(element, attributeName, this)
    this.delegate = delegate
    this.tokensByElement = new Multimap()
  }

  get started () {
    return this.attributeObserver.started
  }

  start () {
    this.attributeObserver.start()
  }

  pause (callback) {
    this.attributeObserver.pause(callback)
  }

  stop () {
    this.attributeObserver.stop()
  }

  refresh () {
    this.attributeObserver.refresh()
  }

  get element () {
    return this.attributeObserver.element
  }

  get attributeName () {
    return this.attributeObserver.attributeName
  }

  elementMatchedAttribute (element) {
    this.tokensMatched(this.readTokensForElement(element))
  }

  elementAttributeValueChanged (element) {
    const [unmatchedTokens, matchedTokens] = this.refreshTokensForElement(element)
    this.tokensUnmatched(unmatchedTokens)
    this.tokensMatched(matchedTokens)
  }

  elementUnmatchedAttribute (element) {
    this.tokensUnmatched(this.tokensByElement.getValuesForKey(element))
  }

  tokensMatched (tokens) {
    tokens.forEach(token => this.tokenMatched(token))
  }

  tokensUnmatched (tokens) {
    tokens.forEach(token => this.tokenUnmatched(token))
  }

  tokenMatched (token) {
    this.delegate.tokenMatched(token)
    this.tokensByElement.add(token.element, token)
  }

  tokenUnmatched (token) {
    this.delegate.tokenUnmatched(token)
    this.tokensByElement.delete(token.element, token)
  }

  refreshTokensForElement (element) {
    const previousTokens = this.tokensByElement.getValuesForKey(element)
    const currentTokens = this.readTokensForElement(element)
    const firstDifferingIndex = zip(previousTokens, currentTokens).findIndex(([previousToken, currentToken]) => !tokensAreEqual(previousToken, currentToken))
    if (firstDifferingIndex == -1) {
      return [[], []]
    } else {
      return [previousTokens.slice(firstDifferingIndex), currentTokens.slice(firstDifferingIndex)]
    }
  }

  readTokensForElement (element) {
    const attributeName = this.attributeName
    const tokenString = element.getAttribute(attributeName) || ''
    return parseTokenString(tokenString, element, attributeName)
  }
}

function parseTokenString (tokenString, element, attributeName) {
  return tokenString.trim().split(/\s+/).filter(content => content.length).map((content, index) => ({
    element,
    attributeName,
    content,
    index
  }))
}

function zip (left, right) {
  const length = Math.max(left.length, right.length)
  return Array.from({
    length
  }, (_, index) => [left[index], right[index]])
}

function tokensAreEqual (left, right) {
  return left && right && left.index == right.index && left.content == right.content
}

class ValueListObserver {
  constructor (element, attributeName, delegate) {
    this.tokenListObserver = new TokenListObserver(element, attributeName, this)
    this.delegate = delegate
    this.parseResultsByToken = new WeakMap()
    this.valuesByTokenByElement = new WeakMap()
  }

  get started () {
    return this.tokenListObserver.started
  }

  start () {
    this.tokenListObserver.start()
  }

  stop () {
    this.tokenListObserver.stop()
  }

  refresh () {
    this.tokenListObserver.refresh()
  }

  get element () {
    return this.tokenListObserver.element
  }

  get attributeName () {
    return this.tokenListObserver.attributeName
  }

  tokenMatched (token) {
    const { element } = token
    const { value } = this.fetchParseResultForToken(token)
    if (value) {
      this.fetchValuesByTokenForElement(element).set(token, value)
      this.delegate.elementMatchedValue(element, value)
    }
  }

  tokenUnmatched (token) {
    const { element } = token
    const { value } = this.fetchParseResultForToken(token)
    if (value) {
      this.fetchValuesByTokenForElement(element).delete(token)
      this.delegate.elementUnmatchedValue(element, value)
    }
  }

  fetchParseResultForToken (token) {
    let parseResult = this.parseResultsByToken.get(token)
    if (!parseResult) {
      parseResult = this.parseToken(token)
      this.parseResultsByToken.set(token, parseResult)
    }
    return parseResult
  }

  fetchValuesByTokenForElement (element) {
    let valuesByToken = this.valuesByTokenByElement.get(element)
    if (!valuesByToken) {
      valuesByToken = new Map()
      this.valuesByTokenByElement.set(element, valuesByToken)
    }
    return valuesByToken
  }

  parseToken (token) {
    try {
      const value = this.delegate.parseValueForToken(token)
      return {
        value
      }
    } catch (error) {
      return {
        error
      }
    }
  }
}

class BindingObserver {
  constructor (context, delegate) {
    this.context = context
    this.delegate = delegate
    this.bindingsByAction = new Map()
  }

  start () {
    if (!this.valueListObserver) {
      this.valueListObserver = new ValueListObserver(this.element, this.actionAttribute, this)
      this.valueListObserver.start()
    }
  }

  stop () {
    if (this.valueListObserver) {
      this.valueListObserver.stop()
      delete this.valueListObserver
      this.disconnectAllActions()
    }
  }

  get element () {
    return this.context.element
  }

  get identifier () {
    return this.context.identifier
  }

  get actionAttribute () {
    return this.schema.actionAttribute
  }

  get schema () {
    return this.context.schema
  }

  get bindings () {
    return Array.from(this.bindingsByAction.values())
  }

  connectAction (action) {
    const binding = new Binding(this.context, action)
    this.bindingsByAction.set(action, binding)
    this.delegate.bindingConnected(binding)
  }

  disconnectAction (action) {
    const binding = this.bindingsByAction.get(action)
    if (binding) {
      this.bindingsByAction.delete(action)
      this.delegate.bindingDisconnected(binding)
    }
  }

  disconnectAllActions () {
    this.bindings.forEach(binding => this.delegate.bindingDisconnected(binding, true))
    this.bindingsByAction.clear()
  }

  parseValueForToken (token) {
    const action = Action.forToken(token, this.schema)
    if (action.identifier == this.identifier) {
      return action
    }
  }

  elementMatchedValue (element, action) {
    this.connectAction(action)
  }

  elementUnmatchedValue (element, action) {
    this.disconnectAction(action)
  }
}

class ValueObserver {
  constructor (context, receiver) {
    this.context = context
    this.receiver = receiver
    this.stringMapObserver = new StringMapObserver(this.element, this)
    this.valueDescriptorMap = this.controller.valueDescriptorMap
  }

  start () {
    this.stringMapObserver.start()
    this.invokeChangedCallbacksForDefaultValues()
  }

  stop () {
    this.stringMapObserver.stop()
  }

  get element () {
    return this.context.element
  }

  get controller () {
    return this.context.controller
  }

  getStringMapKeyForAttribute (attributeName) {
    if (attributeName in this.valueDescriptorMap) {
      return this.valueDescriptorMap[attributeName].name
    }
  }

  stringMapKeyAdded (key, attributeName) {
    const descriptor = this.valueDescriptorMap[attributeName]
    if (!this.hasValue(key)) {
      this.invokeChangedCallback(key, descriptor.writer(this.receiver[key]), descriptor.writer(descriptor.defaultValue))
    }
  }

  stringMapValueChanged (value, name, oldValue) {
    const descriptor = this.valueDescriptorNameMap[name]
    if (value === null) return
    if (oldValue === null) {
      oldValue = descriptor.writer(descriptor.defaultValue)
    }
    this.invokeChangedCallback(name, value, oldValue)
  }

  stringMapKeyRemoved (key, attributeName, oldValue) {
    const descriptor = this.valueDescriptorNameMap[key]
    if (this.hasValue(key)) {
      this.invokeChangedCallback(key, descriptor.writer(this.receiver[key]), oldValue)
    } else {
      this.invokeChangedCallback(key, descriptor.writer(descriptor.defaultValue), oldValue)
    }
  }

  invokeChangedCallbacksForDefaultValues () {
    for (const { key, name, defaultValue, writer } of this.valueDescriptors) {
      if (defaultValue != undefined && !this.controller.data.has(key)) {
        this.invokeChangedCallback(name, writer(defaultValue), undefined)
      }
    }
  }

  invokeChangedCallback (name, rawValue, rawOldValue) {
    const changedMethodName = `${name}Changed`
    const changedMethod = this.receiver[changedMethodName]
    if (typeof changedMethod === 'function') {
      const descriptor = this.valueDescriptorNameMap[name]
      try {
        const value = descriptor.reader(rawValue)
        let oldValue = rawOldValue
        if (rawOldValue) {
          oldValue = descriptor.reader(rawOldValue)
        }
        changedMethod.call(this.receiver, value, oldValue)
      } catch (error) {
        if (error instanceof TypeError) {
          error.message = `Stimulus Value "${this.context.identifier}.${descriptor.name}" - ${error.message}`
        }
        throw error
      }
    }
  }

  get valueDescriptors () {
    const { valueDescriptorMap } = this
    return Object.keys(valueDescriptorMap).map(key => valueDescriptorMap[key])
  }

  get valueDescriptorNameMap () {
    const descriptors = {}
    Object.keys(this.valueDescriptorMap).forEach(key => {
      const descriptor = this.valueDescriptorMap[key]
      descriptors[descriptor.name] = descriptor
    })
    return descriptors
  }

  hasValue (attributeName) {
    const descriptor = this.valueDescriptorNameMap[attributeName]
    const hasMethodName = `has${capitalize(descriptor.name)}`
    return this.receiver[hasMethodName]
  }
}

class TargetObserver {
  constructor (context, delegate) {
    this.context = context
    this.delegate = delegate
    this.targetsByName = new Multimap()
  }

  start () {
    if (!this.tokenListObserver) {
      this.tokenListObserver = new TokenListObserver(this.element, this.attributeName, this)
      this.tokenListObserver.start()
    }
  }

  stop () {
    if (this.tokenListObserver) {
      this.disconnectAllTargets()
      this.tokenListObserver.stop()
      delete this.tokenListObserver
    }
  }

  tokenMatched ({ element, content: name }) {
    if (this.scope.containsElement(element)) {
      this.connectTarget(element, name)
    }
  }

  tokenUnmatched ({ element, content: name }) {
    this.disconnectTarget(element, name)
  }

  connectTarget (element, name) {
    let _a
    if (!this.targetsByName.has(name, element)) {
      this.targetsByName.add(name, element);
      (_a = this.tokenListObserver) === null || _a === void 0 ? void 0 : _a.pause(() => this.delegate.targetConnected(element, name))
    }
  }

  disconnectTarget (element, name) {
    let _a
    if (this.targetsByName.has(name, element)) {
      this.targetsByName.delete(name, element);
      (_a = this.tokenListObserver) === null || _a === void 0 ? void 0 : _a.pause(() => this.delegate.targetDisconnected(element, name))
    }
  }

  disconnectAllTargets () {
    for (const name of this.targetsByName.keys) {
      for (const element of this.targetsByName.getValuesForKey(name)) {
        this.disconnectTarget(element, name)
      }
    }
  }

  get attributeName () {
    return `data-${this.context.identifier}-target`
  }

  get element () {
    return this.context.element
  }

  get scope () {
    return this.context.scope
  }
}

function readInheritableStaticArrayValues (constructor, propertyName) {
  const ancestors = getAncestorsForConstructor(constructor)
  return Array.from(ancestors.reduce((values, constructor) => {
    getOwnStaticArrayValues(constructor, propertyName).forEach(name => values.add(name))
    return values
  }, new Set()))
}

function readInheritableStaticObjectPairs (constructor, propertyName) {
  const ancestors = getAncestorsForConstructor(constructor)
  return ancestors.reduce((pairs, constructor) => {
    pairs.push(...getOwnStaticObjectPairs(constructor, propertyName))
    return pairs
  }, [])
}

function getAncestorsForConstructor (constructor) {
  const ancestors = []
  while (constructor) {
    ancestors.push(constructor)
    constructor = Object.getPrototypeOf(constructor)
  }
  return ancestors.reverse()
}

function getOwnStaticArrayValues (constructor, propertyName) {
  const definition = constructor[propertyName]
  return Array.isArray(definition) ? definition : []
}

function getOwnStaticObjectPairs (constructor, propertyName) {
  const definition = constructor[propertyName]
  return definition ? Object.keys(definition).map(key => [key, definition[key]]) : []
}

class OutletObserver {
  constructor (context, delegate) {
    this.context = context
    this.delegate = delegate
    this.outletsByName = new Multimap()
    this.outletElementsByName = new Multimap()
    this.selectorObserverMap = new Map()
  }

  start () {
    if (this.selectorObserverMap.size === 0) {
      this.outletDefinitions.forEach(outletName => {
        const selector = this.selector(outletName)
        const details = {
          outletName
        }
        if (selector) {
          this.selectorObserverMap.set(outletName, new SelectorObserver(document.body, selector, this, details))
        }
      })
      this.selectorObserverMap.forEach(observer => observer.start())
    }
    this.dependentContexts.forEach(context => context.refresh())
  }

  stop () {
    if (this.selectorObserverMap.size > 0) {
      this.disconnectAllOutlets()
      this.selectorObserverMap.forEach(observer => observer.stop())
      this.selectorObserverMap.clear()
    }
  }

  refresh () {
    this.selectorObserverMap.forEach(observer => observer.refresh())
  }

  selectorMatched (element, _selector, { outletName }) {
    const outlet = this.getOutlet(element, outletName)
    if (outlet) {
      this.connectOutlet(outlet, element, outletName)
    }
  }

  selectorUnmatched (element, _selector, { outletName }) {
    const outlet = this.getOutletFromMap(element, outletName)
    if (outlet) {
      this.disconnectOutlet(outlet, element, outletName)
    }
  }

  selectorMatchElement (element, { outletName }) {
    return this.hasOutlet(element, outletName) && element.matches(`[${this.context.application.schema.controllerAttribute}~=${outletName}]`)
  }

  connectOutlet (outlet, element, outletName) {
    let _a
    if (!this.outletElementsByName.has(outletName, element)) {
      this.outletsByName.add(outletName, outlet)
      this.outletElementsByName.add(outletName, element);
      (_a = this.selectorObserverMap.get(outletName)) === null || _a === void 0 ? void 0 : _a.pause(() => this.delegate.outletConnected(outlet, element, outletName))
    }
  }

  disconnectOutlet (outlet, element, outletName) {
    let _a
    if (this.outletElementsByName.has(outletName, element)) {
      this.outletsByName.delete(outletName, outlet)
      this.outletElementsByName.delete(outletName, element);
      (_a = this.selectorObserverMap.get(outletName)) === null || _a === void 0 ? void 0 : _a.pause(() => this.delegate.outletDisconnected(outlet, element, outletName))
    }
  }

  disconnectAllOutlets () {
    for (const outletName of this.outletElementsByName.keys) {
      for (const element of this.outletElementsByName.getValuesForKey(outletName)) {
        for (const outlet of this.outletsByName.getValuesForKey(outletName)) {
          this.disconnectOutlet(outlet, element, outletName)
        }
      }
    }
  }

  selector (outletName) {
    return this.scope.outlets.getSelectorForOutletName(outletName)
  }

  get outletDependencies () {
    const dependencies = new Multimap()
    this.router.modules.forEach(module => {
      const constructor = module.definition.controllerConstructor
      const outlets = readInheritableStaticArrayValues(constructor, 'outlets')
      outlets.forEach(outlet => dependencies.add(outlet, module.identifier))
    })
    return dependencies
  }

  get outletDefinitions () {
    return this.outletDependencies.getKeysForValue(this.identifier)
  }

  get dependentControllerIdentifiers () {
    return this.outletDependencies.getValuesForKey(this.identifier)
  }

  get dependentContexts () {
    const identifiers = this.dependentControllerIdentifiers
    return this.router.contexts.filter(context => identifiers.includes(context.identifier))
  }

  hasOutlet (element, outletName) {
    return !!this.getOutlet(element, outletName) || !!this.getOutletFromMap(element, outletName)
  }

  getOutlet (element, outletName) {
    return this.application.getControllerForElementAndIdentifier(element, outletName)
  }

  getOutletFromMap (element, outletName) {
    return this.outletsByName.getValuesForKey(outletName).find(outlet => outlet.element === element)
  }

  get scope () {
    return this.context.scope
  }

  get identifier () {
    return this.context.identifier
  }

  get application () {
    return this.context.application
  }

  get router () {
    return this.application.router
  }
}

class Context {
  constructor (module, scope) {
    this.logDebugActivity = (functionName, detail = {}) => {
      const { identifier, controller, element } = this
      detail = Object.assign({
        identifier,
        controller,
        element
      }, detail)
      this.application.logDebugActivity(this.identifier, functionName, detail)
    }
    this.module = module
    this.scope = scope
    this.controller = new module.controllerConstructor(this)
    this.bindingObserver = new BindingObserver(this, this.dispatcher)
    this.valueObserver = new ValueObserver(this, this.controller)
    this.targetObserver = new TargetObserver(this, this)
    this.outletObserver = new OutletObserver(this, this)
    try {
      this.controller.initialize()
      this.logDebugActivity('initialize')
    } catch (error) {
      this.handleError(error, 'initializing controller')
    }
  }

  connect () {
    this.bindingObserver.start()
    this.valueObserver.start()
    this.targetObserver.start()
    this.outletObserver.start()
    try {
      this.controller.connect()
      this.logDebugActivity('connect')
    } catch (error) {
      this.handleError(error, 'connecting controller')
    }
  }

  refresh () {
    this.outletObserver.refresh()
  }

  disconnect () {
    try {
      this.controller.disconnect()
      this.logDebugActivity('disconnect')
    } catch (error) {
      this.handleError(error, 'disconnecting controller')
    }
    this.outletObserver.stop()
    this.targetObserver.stop()
    this.valueObserver.stop()
    this.bindingObserver.stop()
  }

  get application () {
    return this.module.application
  }

  get identifier () {
    return this.module.identifier
  }

  get schema () {
    return this.application.schema
  }

  get dispatcher () {
    return this.application.dispatcher
  }

  get element () {
    return this.scope.element
  }

  get parentElement () {
    return this.element.parentElement
  }

  handleError (error, message, detail = {}) {
    const { identifier, controller, element } = this
    detail = Object.assign({
      identifier,
      controller,
      element
    }, detail)
    this.application.handleError(error, `Error ${message}`, detail)
  }

  targetConnected (element, name) {
    this.invokeControllerMethod(`${name}TargetConnected`, element)
  }

  targetDisconnected (element, name) {
    this.invokeControllerMethod(`${name}TargetDisconnected`, element)
  }

  outletConnected (outlet, element, name) {
    this.invokeControllerMethod(`${namespaceCamelize(name)}OutletConnected`, outlet, element)
  }

  outletDisconnected (outlet, element, name) {
    this.invokeControllerMethod(`${namespaceCamelize(name)}OutletDisconnected`, outlet, element)
  }

  invokeControllerMethod (methodName, ...args) {
    const controller = this.controller
    if (typeof controller[methodName] === 'function') {
      controller[methodName](...args)
    }
  }
}

function bless (constructor) {
  return shadow(constructor, getBlessedProperties(constructor))
}

function shadow (constructor, properties) {
  const shadowConstructor = extend$1(constructor)
  const shadowProperties = getShadowProperties(constructor.prototype, properties)
  Object.defineProperties(shadowConstructor.prototype, shadowProperties)
  return shadowConstructor
}

function getBlessedProperties (constructor) {
  const blessings = readInheritableStaticArrayValues(constructor, 'blessings')
  return blessings.reduce((blessedProperties, blessing) => {
    const properties = blessing(constructor)
    for (const key in properties) {
      const descriptor = blessedProperties[key] || {}
      blessedProperties[key] = Object.assign(descriptor, properties[key])
    }
    return blessedProperties
  }, {})
}

function getShadowProperties (prototype, properties) {
  return getOwnKeys(properties).reduce((shadowProperties, key) => {
    const descriptor = getShadowedDescriptor(prototype, properties, key)
    if (descriptor) {
      Object.assign(shadowProperties, {
        [key]: descriptor
      })
    }
    return shadowProperties
  }, {})
}

function getShadowedDescriptor (prototype, properties, key) {
  const shadowingDescriptor = Object.getOwnPropertyDescriptor(prototype, key)
  const shadowedByValue = shadowingDescriptor && 'value' in shadowingDescriptor
  if (!shadowedByValue) {
    const descriptor = Object.getOwnPropertyDescriptor(properties, key).value
    if (shadowingDescriptor) {
      descriptor.get = shadowingDescriptor.get || descriptor.get
      descriptor.set = shadowingDescriptor.set || descriptor.set
    }
    return descriptor
  }
}

const getOwnKeys = (() => {
  if (typeof Object.getOwnPropertySymbols === 'function') {
    return object => [...Object.getOwnPropertyNames(object), ...Object.getOwnPropertySymbols(object)]
  } else {
    return Object.getOwnPropertyNames
  }
})()

const extend$1 = (() => {
  function extendWithReflect (constructor) {
    function extended () {
      return Reflect.construct(constructor, arguments, new.target)
    }
    extended.prototype = Object.create(constructor.prototype, {
      constructor: {
        value: extended
      }
    })
    Reflect.setPrototypeOf(extended, constructor)
    return extended
  }
  function testReflectExtension () {
    const a = function () {
      this.a.call(this)
    }
    const b = extendWithReflect(a)
    b.prototype.a = function () {}
    return new b()
  }
  try {
    testReflectExtension()
    return extendWithReflect
  } catch (error) {
    return constructor => class extended extends constructor {}
  }
})()

function blessDefinition (definition) {
  return {
    identifier: definition.identifier,
    controllerConstructor: bless(definition.controllerConstructor)
  }
}

class Module {
  constructor (application, definition) {
    this.application = application
    this.definition = blessDefinition(definition)
    this.contextsByScope = new WeakMap()
    this.connectedContexts = new Set()
  }

  get identifier () {
    return this.definition.identifier
  }

  get controllerConstructor () {
    return this.definition.controllerConstructor
  }

  get contexts () {
    return Array.from(this.connectedContexts)
  }

  connectContextForScope (scope) {
    const context = this.fetchContextForScope(scope)
    this.connectedContexts.add(context)
    context.connect()
  }

  disconnectContextForScope (scope) {
    const context = this.contextsByScope.get(scope)
    if (context) {
      this.connectedContexts.delete(context)
      context.disconnect()
    }
  }

  fetchContextForScope (scope) {
    let context = this.contextsByScope.get(scope)
    if (!context) {
      context = new Context(this, scope)
      this.contextsByScope.set(scope, context)
    }
    return context
  }
}

class ClassMap {
  constructor (scope) {
    this.scope = scope
  }

  has (name) {
    return this.data.has(this.getDataKey(name))
  }

  get (name) {
    return this.getAll(name)[0]
  }

  getAll (name) {
    const tokenString = this.data.get(this.getDataKey(name)) || ''
    return tokenize(tokenString)
  }

  getAttributeName (name) {
    return this.data.getAttributeNameForKey(this.getDataKey(name))
  }

  getDataKey (name) {
    return `${name}-class`
  }

  get data () {
    return this.scope.data
  }
}

class DataMap {
  constructor (scope) {
    this.scope = scope
  }

  get element () {
    return this.scope.element
  }

  get identifier () {
    return this.scope.identifier
  }

  get (key) {
    const name = this.getAttributeNameForKey(key)
    return this.element.getAttribute(name)
  }

  set (key, value) {
    const name = this.getAttributeNameForKey(key)
    this.element.setAttribute(name, value)
    return this.get(key)
  }

  has (key) {
    const name = this.getAttributeNameForKey(key)
    return this.element.hasAttribute(name)
  }

  delete (key) {
    if (this.has(key)) {
      const name = this.getAttributeNameForKey(key)
      this.element.removeAttribute(name)
      return true
    } else {
      return false
    }
  }

  getAttributeNameForKey (key) {
    return `data-${this.identifier}-${dasherize(key)}`
  }
}

class Guide {
  constructor (logger) {
    this.warnedKeysByObject = new WeakMap()
    this.logger = logger
  }

  warn (object, key, message) {
    let warnedKeys = this.warnedKeysByObject.get(object)
    if (!warnedKeys) {
      warnedKeys = new Set()
      this.warnedKeysByObject.set(object, warnedKeys)
    }
    if (!warnedKeys.has(key)) {
      warnedKeys.add(key)
      this.logger.warn(message, object)
    }
  }
}

function attributeValueContainsToken (attributeName, token) {
  return `[${attributeName}~="${token}"]`
}

class TargetSet {
  constructor (scope) {
    this.scope = scope
  }

  get element () {
    return this.scope.element
  }

  get identifier () {
    return this.scope.identifier
  }

  get schema () {
    return this.scope.schema
  }

  has (targetName) {
    return this.find(targetName) != null
  }

  find (...targetNames) {
    return targetNames.reduce((target, targetName) => target || this.findTarget(targetName) || this.findLegacyTarget(targetName), undefined)
  }

  findAll (...targetNames) {
    return targetNames.reduce((targets, targetName) => [...targets, ...this.findAllTargets(targetName), ...this.findAllLegacyTargets(targetName)], [])
  }

  findTarget (targetName) {
    const selector = this.getSelectorForTargetName(targetName)
    return this.scope.findElement(selector)
  }

  findAllTargets (targetName) {
    const selector = this.getSelectorForTargetName(targetName)
    return this.scope.findAllElements(selector)
  }

  getSelectorForTargetName (targetName) {
    const attributeName = this.schema.targetAttributeForScope(this.identifier)
    return attributeValueContainsToken(attributeName, targetName)
  }

  findLegacyTarget (targetName) {
    const selector = this.getLegacySelectorForTargetName(targetName)
    return this.deprecate(this.scope.findElement(selector), targetName)
  }

  findAllLegacyTargets (targetName) {
    const selector = this.getLegacySelectorForTargetName(targetName)
    return this.scope.findAllElements(selector).map(element => this.deprecate(element, targetName))
  }

  getLegacySelectorForTargetName (targetName) {
    const targetDescriptor = `${this.identifier}.${targetName}`
    return attributeValueContainsToken(this.schema.targetAttribute, targetDescriptor)
  }

  deprecate (element, targetName) {
    if (element) {
      const { identifier } = this
      const attributeName = this.schema.targetAttribute
      const revisedAttributeName = this.schema.targetAttributeForScope(identifier)
      this.guide.warn(element, `target:${targetName}`, `Please replace ${attributeName}="${identifier}.${targetName}" with ${revisedAttributeName}="${targetName}". ` + `The ${attributeName} attribute is deprecated and will be removed in a future version of Stimulus.`)
    }
    return element
  }

  get guide () {
    return this.scope.guide
  }
}

class OutletSet {
  constructor (scope, controllerElement) {
    this.scope = scope
    this.controllerElement = controllerElement
  }

  get element () {
    return this.scope.element
  }

  get identifier () {
    return this.scope.identifier
  }

  get schema () {
    return this.scope.schema
  }

  has (outletName) {
    return this.find(outletName) != null
  }

  find (...outletNames) {
    return outletNames.reduce((outlet, outletName) => outlet || this.findOutlet(outletName), undefined)
  }

  findAll (...outletNames) {
    return outletNames.reduce((outlets, outletName) => [...outlets, ...this.findAllOutlets(outletName)], [])
  }

  getSelectorForOutletName (outletName) {
    const attributeName = this.schema.outletAttributeForScope(this.identifier, outletName)
    return this.controllerElement.getAttribute(attributeName)
  }

  findOutlet (outletName) {
    const selector = this.getSelectorForOutletName(outletName)
    if (selector) return this.findElement(selector, outletName)
  }

  findAllOutlets (outletName) {
    const selector = this.getSelectorForOutletName(outletName)
    return selector ? this.findAllElements(selector, outletName) : []
  }

  findElement (selector, outletName) {
    const elements = this.scope.queryElements(selector)
    return elements.filter(element => this.matchesElement(element, selector, outletName))[0]
  }

  findAllElements (selector, outletName) {
    const elements = this.scope.queryElements(selector)
    return elements.filter(element => this.matchesElement(element, selector, outletName))
  }

  matchesElement (element, selector, outletName) {
    const controllerAttribute = element.getAttribute(this.scope.schema.controllerAttribute) || ''
    return element.matches(selector) && controllerAttribute.split(' ').includes(outletName)
  }
}

class Scope {
  constructor (schema, element, identifier, logger) {
    this.targets = new TargetSet(this)
    this.classes = new ClassMap(this)
    this.data = new DataMap(this)
    this.containsElement = element => element.closest(this.controllerSelector) === this.element
    this.schema = schema
    this.element = element
    this.identifier = identifier
    this.guide = new Guide(logger)
    this.outlets = new OutletSet(this.documentScope, element)
  }

  findElement (selector) {
    return this.element.matches(selector) ? this.element : this.queryElements(selector).find(this.containsElement)
  }

  findAllElements (selector) {
    return [...this.element.matches(selector) ? [this.element] : [], ...this.queryElements(selector).filter(this.containsElement)]
  }

  queryElements (selector) {
    return Array.from(this.element.querySelectorAll(selector))
  }

  get controllerSelector () {
    return attributeValueContainsToken(this.schema.controllerAttribute, this.identifier)
  }

  get isDocumentScope () {
    return this.element === document.documentElement
  }

  get documentScope () {
    return this.isDocumentScope ? this : new Scope(this.schema, document.documentElement, this.identifier, this.guide.logger)
  }
}

class ScopeObserver {
  constructor (element, schema, delegate) {
    this.element = element
    this.schema = schema
    this.delegate = delegate
    this.valueListObserver = new ValueListObserver(this.element, this.controllerAttribute, this)
    this.scopesByIdentifierByElement = new WeakMap()
    this.scopeReferenceCounts = new WeakMap()
  }

  start () {
    this.valueListObserver.start()
  }

  stop () {
    this.valueListObserver.stop()
  }

  get controllerAttribute () {
    return this.schema.controllerAttribute
  }

  parseValueForToken (token) {
    const { element, content: identifier } = token
    const scopesByIdentifier = this.fetchScopesByIdentifierForElement(element)
    let scope = scopesByIdentifier.get(identifier)
    if (!scope) {
      scope = this.delegate.createScopeForElementAndIdentifier(element, identifier)
      scopesByIdentifier.set(identifier, scope)
    }
    return scope
  }

  elementMatchedValue (element, value) {
    const referenceCount = (this.scopeReferenceCounts.get(value) || 0) + 1
    this.scopeReferenceCounts.set(value, referenceCount)
    if (referenceCount == 1) {
      this.delegate.scopeConnected(value)
    }
  }

  elementUnmatchedValue (element, value) {
    const referenceCount = this.scopeReferenceCounts.get(value)
    if (referenceCount) {
      this.scopeReferenceCounts.set(value, referenceCount - 1)
      if (referenceCount == 1) {
        this.delegate.scopeDisconnected(value)
      }
    }
  }

  fetchScopesByIdentifierForElement (element) {
    let scopesByIdentifier = this.scopesByIdentifierByElement.get(element)
    if (!scopesByIdentifier) {
      scopesByIdentifier = new Map()
      this.scopesByIdentifierByElement.set(element, scopesByIdentifier)
    }
    return scopesByIdentifier
  }
}

class Router {
  constructor (application) {
    this.application = application
    this.scopeObserver = new ScopeObserver(this.element, this.schema, this)
    this.scopesByIdentifier = new Multimap()
    this.modulesByIdentifier = new Map()
  }

  get element () {
    return this.application.element
  }

  get schema () {
    return this.application.schema
  }

  get logger () {
    return this.application.logger
  }

  get controllerAttribute () {
    return this.schema.controllerAttribute
  }

  get modules () {
    return Array.from(this.modulesByIdentifier.values())
  }

  get contexts () {
    return this.modules.reduce((contexts, module) => contexts.concat(module.contexts), [])
  }

  start () {
    this.scopeObserver.start()
  }

  stop () {
    this.scopeObserver.stop()
  }

  loadDefinition (definition) {
    this.unloadIdentifier(definition.identifier)
    const module = new Module(this.application, definition)
    this.connectModule(module)
    const afterLoad = definition.controllerConstructor.afterLoad
    if (afterLoad) {
      afterLoad(definition.identifier, this.application)
    }
  }

  unloadIdentifier (identifier) {
    const module = this.modulesByIdentifier.get(identifier)
    if (module) {
      this.disconnectModule(module)
    }
  }

  getContextForElementAndIdentifier (element, identifier) {
    const module = this.modulesByIdentifier.get(identifier)
    if (module) {
      return module.contexts.find(context => context.element == element)
    }
  }

  handleError (error, message, detail) {
    this.application.handleError(error, message, detail)
  }

  createScopeForElementAndIdentifier (element, identifier) {
    return new Scope(this.schema, element, identifier, this.logger)
  }

  scopeConnected (scope) {
    this.scopesByIdentifier.add(scope.identifier, scope)
    const module = this.modulesByIdentifier.get(scope.identifier)
    if (module) {
      module.connectContextForScope(scope)
    }
  }

  scopeDisconnected (scope) {
    this.scopesByIdentifier.delete(scope.identifier, scope)
    const module = this.modulesByIdentifier.get(scope.identifier)
    if (module) {
      module.disconnectContextForScope(scope)
    }
  }

  connectModule (module) {
    this.modulesByIdentifier.set(module.identifier, module)
    const scopes = this.scopesByIdentifier.getValuesForKey(module.identifier)
    scopes.forEach(scope => module.connectContextForScope(scope))
  }

  disconnectModule (module) {
    this.modulesByIdentifier.delete(module.identifier)
    const scopes = this.scopesByIdentifier.getValuesForKey(module.identifier)
    scopes.forEach(scope => module.disconnectContextForScope(scope))
  }
}

const defaultSchema = {
  controllerAttribute: 'data-controller',
  actionAttribute: 'data-action',
  targetAttribute: 'data-target',
  targetAttributeForScope: identifier => `data-${identifier}-target`,
  outletAttributeForScope: (identifier, outlet) => `data-${identifier}-${outlet}-outlet`,
  keyMappings: Object.assign(Object.assign({
    enter: 'Enter',
    tab: 'Tab',
    esc: 'Escape',
    space: ' ',
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    home: 'Home',
    end: 'End'
  }, objectFromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map(c => [c, c]))), objectFromEntries('0123456789'.split('').map(n => [n, n])))
}

function objectFromEntries (array) {
  return array.reduce((memo, [k, v]) => Object.assign(Object.assign({}, memo), {
    [k]: v
  }), {})
}

class Application {
  constructor (element = document.documentElement, schema = defaultSchema) {
    this.logger = console
    this.debug = false
    this.logDebugActivity = (identifier, functionName, detail = {}) => {
      if (this.debug) {
        this.logFormattedMessage(identifier, functionName, detail)
      }
    }
    this.element = element
    this.schema = schema
    this.dispatcher = new Dispatcher(this)
    this.router = new Router(this)
    this.actionDescriptorFilters = Object.assign({}, defaultActionDescriptorFilters)
  }

  static start (element, schema) {
    const application = new this(element, schema)
    application.start()
    return application
  }

  async start () {
    await domReady()
    this.logDebugActivity('application', 'starting')
    this.dispatcher.start()
    this.router.start()
    this.logDebugActivity('application', 'start')
  }

  stop () {
    this.logDebugActivity('application', 'stopping')
    this.dispatcher.stop()
    this.router.stop()
    this.logDebugActivity('application', 'stop')
  }

  register (identifier, controllerConstructor) {
    this.load({
      identifier,
      controllerConstructor
    })
  }

  registerActionOption (name, filter) {
    this.actionDescriptorFilters[name] = filter
  }

  load (head, ...rest) {
    const definitions = Array.isArray(head) ? head : [head, ...rest]
    definitions.forEach(definition => {
      if (definition.controllerConstructor.shouldLoad) {
        this.router.loadDefinition(definition)
      }
    })
  }

  unload (head, ...rest) {
    const identifiers = Array.isArray(head) ? head : [head, ...rest]
    identifiers.forEach(identifier => this.router.unloadIdentifier(identifier))
  }

  get controllers () {
    return this.router.contexts.map(context => context.controller)
  }

  getControllerForElementAndIdentifier (element, identifier) {
    const context = this.router.getContextForElementAndIdentifier(element, identifier)
    return context ? context.controller : null
  }

  handleError (error, message, detail) {
    let _a
    this.logger.error('%s\n\n%o\n\n%o', message, error, detail);
    (_a = window.onerror) === null || _a === void 0 ? void 0 : _a.call(window, message, '', 0, 0, error)
  }

  logFormattedMessage (identifier, functionName, detail = {}) {
    detail = Object.assign({
      application: this
    }, detail)
    this.logger.groupCollapsed(`${identifier} #${functionName}`)
    this.logger.log('details:', Object.assign({}, detail))
    this.logger.groupEnd()
  }
}

function domReady () {
  return new Promise(resolve => {
    if (document.readyState == 'loading') {
      document.addEventListener('DOMContentLoaded', () => resolve())
    } else {
      resolve()
    }
  })
}

function ClassPropertiesBlessing (constructor) {
  const classes = readInheritableStaticArrayValues(constructor, 'classes')
  return classes.reduce((properties, classDefinition) => Object.assign(properties, propertiesForClassDefinition(classDefinition)), {})
}

function propertiesForClassDefinition (key) {
  return {
    [`${key}Class`]: {
      get () {
        const { classes } = this
        if (classes.has(key)) {
          return classes.get(key)
        } else {
          const attribute = classes.getAttributeName(key)
          throw new Error(`Missing attribute "${attribute}"`)
        }
      }
    },
    [`${key}Classes`]: {
      get () {
        return this.classes.getAll(key)
      }
    },
    [`has${capitalize(key)}Class`]: {
      get () {
        return this.classes.has(key)
      }
    }
  }
}

function OutletPropertiesBlessing (constructor) {
  const outlets = readInheritableStaticArrayValues(constructor, 'outlets')
  return outlets.reduce((properties, outletDefinition) => Object.assign(properties, propertiesForOutletDefinition(outletDefinition)), {})
}

function propertiesForOutletDefinition (name) {
  const camelizedName = namespaceCamelize(name)
  return {
    [`${camelizedName}Outlet`]: {
      get () {
        const outlet = this.outlets.find(name)
        if (outlet) {
          const outletController = this.application.getControllerForElementAndIdentifier(outlet, name)
          if (outletController) {
            return outletController
          } else {
            throw new Error(`Missing "data-controller=${name}" attribute on outlet element for "${this.identifier}" controller`)
          }
        }
        throw new Error(`Missing outlet element "${name}" for "${this.identifier}" controller`)
      }
    },
    [`${camelizedName}Outlets`]: {
      get () {
        const outlets = this.outlets.findAll(name)
        if (outlets.length > 0) {
          return outlets.map(outlet => {
            const controller = this.application.getControllerForElementAndIdentifier(outlet, name)
            if (controller) {
              return controller
            } else {
              console.warn(`The provided outlet element is missing the outlet controller "${name}" for "${this.identifier}"`, outlet)
            }
          }).filter(controller => controller)
        }
        return []
      }
    },
    [`${camelizedName}OutletElement`]: {
      get () {
        const outlet = this.outlets.find(name)
        if (outlet) {
          return outlet
        } else {
          throw new Error(`Missing outlet element "${name}" for "${this.identifier}" controller`)
        }
      }
    },
    [`${camelizedName}OutletElements`]: {
      get () {
        return this.outlets.findAll(name)
      }
    },
    [`has${capitalize(camelizedName)}Outlet`]: {
      get () {
        return this.outlets.has(name)
      }
    }
  }
}

function TargetPropertiesBlessing (constructor) {
  const targets = readInheritableStaticArrayValues(constructor, 'targets')
  return targets.reduce((properties, targetDefinition) => Object.assign(properties, propertiesForTargetDefinition(targetDefinition)), {})
}

function propertiesForTargetDefinition (name) {
  return {
    [`${name}Target`]: {
      get () {
        const target = this.targets.find(name)
        if (target) {
          return target
        } else {
          throw new Error(`Missing target element "${name}" for "${this.identifier}" controller`)
        }
      }
    },
    [`${name}Targets`]: {
      get () {
        return this.targets.findAll(name)
      }
    },
    [`has${capitalize(name)}Target`]: {
      get () {
        return this.targets.has(name)
      }
    }
  }
}

function ValuePropertiesBlessing (constructor) {
  const valueDefinitionPairs = readInheritableStaticObjectPairs(constructor, 'values')
  const propertyDescriptorMap = {
    valueDescriptorMap: {
      get () {
        return valueDefinitionPairs.reduce((result, valueDefinitionPair) => {
          const valueDescriptor = parseValueDefinitionPair(valueDefinitionPair, this.identifier)
          const attributeName = this.data.getAttributeNameForKey(valueDescriptor.key)
          return Object.assign(result, {
            [attributeName]: valueDescriptor
          })
        }, {})
      }
    }
  }
  return valueDefinitionPairs.reduce((properties, valueDefinitionPair) => Object.assign(properties, propertiesForValueDefinitionPair(valueDefinitionPair)), propertyDescriptorMap)
}

function propertiesForValueDefinitionPair (valueDefinitionPair, controller) {
  const definition = parseValueDefinitionPair(valueDefinitionPair, controller)
  const { key, name, reader: read, writer: write } = definition
  return {
    [name]: {
      get () {
        const value = this.data.get(key)
        if (value !== null) {
          return read(value)
        } else {
          return definition.defaultValue
        }
      },
      set (value) {
        if (value === undefined) {
          this.data.delete(key)
        } else {
          this.data.set(key, write(value))
        }
      }
    },
    [`has${capitalize(name)}`]: {
      get () {
        return this.data.has(key) || definition.hasCustomDefaultValue
      }
    }
  }
}

function parseValueDefinitionPair ([token, typeDefinition], controller) {
  return valueDescriptorForTokenAndTypeDefinition({
    controller,
    token,
    typeDefinition
  })
}

function parseValueTypeConstant (constant) {
  switch (constant) {
    case Array:
      return 'array'

    case Boolean:
      return 'boolean'

    case Number:
      return 'number'

    case Object:
      return 'object'

    case String:
      return 'string'
  }
}

function parseValueTypeDefault (defaultValue) {
  switch (typeof defaultValue) {
    case 'boolean':
      return 'boolean'

    case 'number':
      return 'number'

    case 'string':
      return 'string'
  }
  if (Array.isArray(defaultValue)) return 'array'
  if (Object.prototype.toString.call(defaultValue) === '[object Object]') return 'object'
}

function parseValueTypeObject (payload) {
  const typeFromObject = parseValueTypeConstant(payload.typeObject.type)
  if (!typeFromObject) return
  const defaultValueType = parseValueTypeDefault(payload.typeObject.default)
  if (typeFromObject !== defaultValueType) {
    const propertyPath = payload.controller ? `${payload.controller}.${payload.token}` : payload.token
    throw new Error(`The specified default value for the Stimulus Value "${propertyPath}" must match the defined type "${typeFromObject}". The provided default value of "${payload.typeObject.default}" is of type "${defaultValueType}".`)
  }
  return typeFromObject
}

function parseValueTypeDefinition (payload) {
  const typeFromObject = parseValueTypeObject({
    controller: payload.controller,
    token: payload.token,
    typeObject: payload.typeDefinition
  })
  const typeFromDefaultValue = parseValueTypeDefault(payload.typeDefinition)
  const typeFromConstant = parseValueTypeConstant(payload.typeDefinition)
  const type = typeFromObject || typeFromDefaultValue || typeFromConstant
  if (type) return type
  const propertyPath = payload.controller ? `${payload.controller}.${payload.typeDefinition}` : payload.token
  throw new Error(`Unknown value type "${propertyPath}" for "${payload.token}" value`)
}

function defaultValueForDefinition (typeDefinition) {
  const constant = parseValueTypeConstant(typeDefinition)
  if (constant) return defaultValuesByType[constant]
  const defaultValue = typeDefinition.default
  if (defaultValue !== undefined) return defaultValue
  return typeDefinition
}

function valueDescriptorForTokenAndTypeDefinition (payload) {
  const key = `${dasherize(payload.token)}-value`
  const type = parseValueTypeDefinition(payload)
  return {
    type,
    key,
    name: camelize(key),
    get defaultValue () {
      return defaultValueForDefinition(payload.typeDefinition)
    },
    get hasCustomDefaultValue () {
      return parseValueTypeDefault(payload.typeDefinition) !== undefined
    },
    reader: readers[type],
    writer: writers[type] || writers.default
  }
}

const defaultValuesByType = {
  get array () {
    return []
  },
  boolean: false,
  number: 0,
  get object () {
    return {}
  },
  string: ''
}

const readers = {
  array (value) {
    const array = JSON.parse(value)
    if (!Array.isArray(array)) {
      throw new TypeError(`expected value of type "array" but instead got value "${value}" of type "${parseValueTypeDefault(array)}"`)
    }
    return array
  },
  boolean (value) {
    return !(value == '0' || String(value).toLowerCase() == 'false')
  },
  number (value) {
    return Number(value)
  },
  object (value) {
    const object = JSON.parse(value)
    if (object === null || typeof object !== 'object' || Array.isArray(object)) {
      throw new TypeError(`expected value of type "object" but instead got value "${value}" of type "${parseValueTypeDefault(object)}"`)
    }
    return object
  },
  string (value) {
    return value
  }
}

const writers = {
  default: writeString,
  array: writeJSON,
  object: writeJSON
}

function writeJSON (value) {
  return JSON.stringify(value)
}

function writeString (value) {
  return `${value}`
}

class Controller {
  constructor (context) {
    this.context = context
  }

  static get shouldLoad () {
    return true
  }

  static afterLoad (_identifier, _application) {

  }

  get application () {
    return this.context.application
  }

  get scope () {
    return this.context.scope
  }

  get element () {
    return this.scope.element
  }

  get identifier () {
    return this.scope.identifier
  }

  get targets () {
    return this.scope.targets
  }

  get outlets () {
    return this.scope.outlets
  }

  get classes () {
    return this.scope.classes
  }

  get data () {
    return this.scope.data
  }

  initialize () {}
  connect () {}
  disconnect () {}
  dispatch (eventName, { target = this.element, detail = {}, prefix = this.identifier, bubbles = true, cancelable = true } = {}) {
    const type = prefix ? `${prefix}:${eventName}` : eventName
    const event = new CustomEvent(type, {
      detail,
      bubbles,
      cancelable
    })
    target.dispatchEvent(event)
    return event
  }
}

Controller.blessings = [ClassPropertiesBlessing, TargetPropertiesBlessing, ValuePropertiesBlessing, OutletPropertiesBlessing]

Controller.targets = []

Controller.outlets = []

Controller.values = {}

class BsInstanceController extends Controller {
  static values = {
    class: String,
    connection: String,
    method: String
  }

  connect () {
    if (this.hasConnectionValue) {
      const obj = bootstrap[this.classValue].getOrCreateInstance(this.element)
      if (obj == null) return
      obj[this.connectionValue]()
    }
  }

  manipulate () {
    const obj = bootstrap[this.classValue].getInstance(this.element)
    if (obj == null) return
    obj[this.methodValue]()
  }
}

/** !
 * hotkeys-js v3.10.1
 * A simple micro-library for defining and dispatching keyboard shortcuts. It has no dependencies.
 *
 * Copyright (c) 2022 kenny wong <wowohoo@qq.com>
 * http://jaywcjlove.github.io/hotkeys
 * Licensed under the MIT license
 */ const isff = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase().indexOf('firefox') > 0 : false

function addEvent (object, event, method, useCapture) {
  if (object.addEventListener) {
    object.addEventListener(event, method, useCapture)
  } else if (object.attachEvent) {
    object.attachEvent('on'.concat(event), function () {
      method(window.event)
    })
  }
}

function getMods (modifier, key) {
  const mods = key.slice(0, key.length - 1)
  for (let i = 0; i < mods.length; i++) {
    mods[i] = modifier[mods[i].toLowerCase()]
  }
  return mods
}

function getKeys (key) {
  if (typeof key !== 'string') key = ''
  key = key.replace(/\s/g, '')
  const keys = key.split(',')
  let index = keys.lastIndexOf('')
  for (;index >= 0;) {
    keys[index - 1] += ','
    keys.splice(index, 1)
    index = keys.lastIndexOf('')
  }
  return keys
}

function compareArray (a1, a2) {
  const arr1 = a1.length >= a2.length ? a1 : a2
  const arr2 = a1.length >= a2.length ? a2 : a1
  let isIndex = true
  for (let i = 0; i < arr1.length; i++) {
    if (arr2.indexOf(arr1[i]) === -1) isIndex = false
  }
  return isIndex
}

const _keyMap = {
  backspace: 8,
  '⌫': 8,
  tab: 9,
  clear: 12,
  enter: 13,
  '↩': 13,
  return: 13,
  esc: 27,
  escape: 27,
  space: 32,
  left: 37,
  up: 38,
  right: 39,
  down: 40,
  del: 46,
  delete: 46,
  ins: 45,
  insert: 45,
  home: 36,
  end: 35,
  pageup: 33,
  pagedown: 34,
  capslock: 20,
  num_0: 96,
  num_1: 97,
  num_2: 98,
  num_3: 99,
  num_4: 100,
  num_5: 101,
  num_6: 102,
  num_7: 103,
  num_8: 104,
  num_9: 105,
  num_multiply: 106,
  num_add: 107,
  num_enter: 108,
  num_subtract: 109,
  num_decimal: 110,
  num_divide: 111,
  '⇪': 20,
  ',': 188,
  '.': 190,
  '/': 191,
  '`': 192,
  '-': isff ? 173 : 189,
  '=': isff ? 61 : 187,
  ';': isff ? 59 : 186,
  "'": 222,
  '[': 219,
  ']': 221,
  '\\': 220
}

const _modifier = {
  '⇧': 16,
  shift: 16,
  '⌥': 18,
  alt: 18,
  option: 18,
  '⌃': 17,
  ctrl: 17,
  control: 17,
  '⌘': 91,
  cmd: 91,
  command: 91
}

const modifierMap = {
  16: 'shiftKey',
  18: 'altKey',
  17: 'ctrlKey',
  91: 'metaKey',
  shiftKey: 16,
  ctrlKey: 17,
  altKey: 18,
  metaKey: 91
}

const _mods = {
  16: false,
  18: false,
  17: false,
  91: false
}

const _handlers = {}

for (let k = 1; k < 20; k++) {
  _keyMap['f'.concat(k)] = 111 + k
}

let _downKeys = []

let winListendFocus = false

let _scope = 'all'

const elementHasBindEvent = []

const code = function code (x) {
  return _keyMap[x.toLowerCase()] || _modifier[x.toLowerCase()] || x.toUpperCase().charCodeAt(0)
}

const getKey = function getKey (x) {
  return Object.keys(_keyMap).find(function (k) {
    return _keyMap[k] === x
  })
}

const getModifier = function getModifier (x) {
  return Object.keys(_modifier).find(function (k) {
    return _modifier[k] === x
  })
}

function setScope (scope) {
  _scope = scope || 'all'
}

function getScope () {
  return _scope || 'all'
}

function getPressedKeyCodes () {
  return _downKeys.slice(0)
}

function getPressedKeyString () {
  return _downKeys.map(function (c) {
    return getKey(c) || getModifier(c) || String.fromCharCode(c)
  })
}

function filter (event) {
  const target = event.target || event.srcElement
  const tagName = target.tagName
  let flag = true
  if (target.isContentEditable || (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') && !target.readOnly) {
    flag = false
  }
  return flag
}

function isPressed (keyCode) {
  if (typeof keyCode === 'string') {
    keyCode = code(keyCode)
  }
  return _downKeys.indexOf(keyCode) !== -1
}

function deleteScope (scope, newScope) {
  let handlers
  let i
  if (!scope) scope = getScope()
  for (const key in _handlers) {
    if (Object.prototype.hasOwnProperty.call(_handlers, key)) {
      handlers = _handlers[key]
      for (i = 0; i < handlers.length;) {
        if (handlers[i].scope === scope) handlers.splice(i, 1); else i++
      }
    }
  }
  if (getScope() === scope) setScope(newScope || 'all')
}

function clearModifier (event) {
  let key = event.keyCode || event.which || event.charCode
  const i = _downKeys.indexOf(key)
  if (i >= 0) {
    _downKeys.splice(i, 1)
  }
  if (event.key && event.key.toLowerCase() === 'meta') {
    _downKeys.splice(0, _downKeys.length)
  }
  if (key === 93 || key === 224) key = 91
  if (key in _mods) {
    _mods[key] = false
    for (const k in _modifier) {
      if (_modifier[k] === key) hotkeys[k] = false
    }
  }
}

function unbind (keysInfo) {
  if (typeof keysInfo === 'undefined') {
    Object.keys(_handlers).forEach(function (key) {
      return delete _handlers[key]
    })
  } else if (Array.isArray(keysInfo)) {
    keysInfo.forEach(function (info) {
      if (info.key) eachUnbind(info)
    })
  } else if (typeof keysInfo === 'object') {
    if (keysInfo.key) eachUnbind(keysInfo)
  } else if (typeof keysInfo === 'string') {
    for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key]
    }
    let scope = args[0]; let method = args[1]
    if (typeof scope === 'function') {
      method = scope
      scope = ''
    }
    eachUnbind({
      key: keysInfo,
      scope,
      method,
      splitKey: '+'
    })
  }
}

var eachUnbind = function eachUnbind (_ref) {
  const key = _ref.key; let scope = _ref.scope; const method = _ref.method; const _ref$splitKey = _ref.splitKey; const splitKey = _ref$splitKey === void 0 ? '+' : _ref$splitKey
  const multipleKeys = getKeys(key)
  multipleKeys.forEach(function (originKey) {
    const unbindKeys = originKey.split(splitKey)
    const len = unbindKeys.length
    const lastKey = unbindKeys[len - 1]
    const keyCode = lastKey === '*' ? '*' : code(lastKey)
    if (!_handlers[keyCode]) return
    if (!scope) scope = getScope()
    const mods = len > 1 ? getMods(_modifier, unbindKeys) : []
    _handlers[keyCode] = _handlers[keyCode].filter(function (record) {
      const isMatchingMethod = method ? record.method === method : true
      return !(isMatchingMethod && record.scope === scope && compareArray(record.mods, mods))
    })
  })
}

function eventHandler (event, handler, scope, element) {
  if (handler.element !== element) {
    return
  }
  let modifiersMatch
  if (handler.scope === scope || handler.scope === 'all') {
    modifiersMatch = handler.mods.length > 0
    for (const y in _mods) {
      if (Object.prototype.hasOwnProperty.call(_mods, y)) {
        if (!_mods[y] && handler.mods.indexOf(+y) > -1 || _mods[y] && handler.mods.indexOf(+y) === -1) {
          modifiersMatch = false
        }
      }
    }
    if (handler.mods.length === 0 && !_mods[16] && !_mods[18] && !_mods[17] && !_mods[91] || modifiersMatch || handler.shortcut === '*') {
      if (handler.method(event, handler) === false) {
        if (event.preventDefault) event.preventDefault(); else event.returnValue = false
        if (event.stopPropagation) event.stopPropagation()
        if (event.cancelBubble) event.cancelBubble = true
      }
    }
  }
}

function dispatch (event, element) {
  const asterisk = _handlers['*']
  let key = event.keyCode || event.which || event.charCode
  if (!hotkeys.filter.call(this, event)) return
  if (key === 93 || key === 224) key = 91
  if (_downKeys.indexOf(key) === -1 && key !== 229) _downKeys.push(key);
  ['ctrlKey', 'altKey', 'shiftKey', 'metaKey'].forEach(function (keyName) {
    const keyNum = modifierMap[keyName]
    if (event[keyName] && _downKeys.indexOf(keyNum) === -1) {
      _downKeys.push(keyNum)
    } else if (!event[keyName] && _downKeys.indexOf(keyNum) > -1) {
      _downKeys.splice(_downKeys.indexOf(keyNum), 1)
    } else if (keyName === 'metaKey' && event[keyName] && _downKeys.length === 3) {
      if (!(event.ctrlKey || event.shiftKey || event.altKey)) {
        _downKeys = _downKeys.slice(_downKeys.indexOf(keyNum))
      }
    }
  })
  if (key in _mods) {
    _mods[key] = true
    for (const k in _modifier) {
      if (_modifier[k] === key) hotkeys[k] = true
    }
    if (!asterisk) return
  }
  for (const e in _mods) {
    if (Object.prototype.hasOwnProperty.call(_mods, e)) {
      _mods[e] = event[modifierMap[e]]
    }
  }
  if (event.getModifierState && !(event.altKey && !event.ctrlKey) && event.getModifierState('AltGraph')) {
    if (_downKeys.indexOf(17) === -1) {
      _downKeys.push(17)
    }
    if (_downKeys.indexOf(18) === -1) {
      _downKeys.push(18)
    }
    _mods[17] = true
    _mods[18] = true
  }
  const scope = getScope()
  if (asterisk) {
    for (let i = 0; i < asterisk.length; i++) {
      if (asterisk[i].scope === scope && (event.type === 'keydown' && asterisk[i].keydown || event.type === 'keyup' && asterisk[i].keyup)) {
        eventHandler(event, asterisk[i], scope, element)
      }
    }
  }
  if (!(key in _handlers)) return
  for (let _i = 0; _i < _handlers[key].length; _i++) {
    if (event.type === 'keydown' && _handlers[key][_i].keydown || event.type === 'keyup' && _handlers[key][_i].keyup) {
      if (_handlers[key][_i].key) {
        const record = _handlers[key][_i]
        const splitKey = record.splitKey
        const keyShortcut = record.key.split(splitKey)
        const _downKeysCurrent = []
        for (let a = 0; a < keyShortcut.length; a++) {
          _downKeysCurrent.push(code(keyShortcut[a]))
        }
        if (_downKeysCurrent.sort().join('') === _downKeys.sort().join('')) {
          eventHandler(event, record, scope, element)
        }
      }
    }
  }
}

function isElementBind (element) {
  return elementHasBindEvent.indexOf(element) > -1
}

function hotkeys (key, option, method) {
  _downKeys = []
  const keys = getKeys(key)
  let mods = []
  let scope = 'all'
  let element = document
  let i = 0
  let keyup = false
  let keydown = true
  let splitKey = '+'
  let capture = false
  if (method === undefined && typeof option === 'function') {
    method = option
  }
  if (Object.prototype.toString.call(option) === '[object Object]') {
    if (option.scope) scope = option.scope
    if (option.element) element = option.element
    if (option.keyup) keyup = option.keyup
    if (option.keydown !== undefined) keydown = option.keydown
    if (option.capture !== undefined) capture = option.capture
    if (typeof option.splitKey === 'string') splitKey = option.splitKey
  }
  if (typeof option === 'string') scope = option
  for (;i < keys.length; i++) {
    key = keys[i].split(splitKey)
    mods = []
    if (key.length > 1) mods = getMods(_modifier, key)
    key = key[key.length - 1]
    key = key === '*' ? '*' : code(key)
    if (!(key in _handlers)) _handlers[key] = []
    _handlers[key].push({
      keyup,
      keydown,
      scope,
      mods,
      shortcut: keys[i],
      method,
      key: keys[i],
      splitKey,
      element
    })
  }
  if (typeof element !== 'undefined' && !isElementBind(element) && window) {
    elementHasBindEvent.push(element)
    addEvent(element, 'keydown', function (e) {
      dispatch(e, element)
    }, capture)
    if (!winListendFocus) {
      winListendFocus = true
      addEvent(window, 'focus', function () {
        _downKeys = []
      }, capture)
    }
    addEvent(element, 'keyup', function (e) {
      dispatch(e, element)
      clearModifier(e)
    }, capture)
  }
}

function trigger (shortcut) {
  const scope = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'all'
  Object.keys(_handlers).forEach(function (key) {
    const dataList = _handlers[key].filter(function (item) {
      return item.scope === scope && item.shortcut === shortcut
    })
    dataList.forEach(function (data) {
      if (data && data.method) {
        data.method()
      }
    })
  })
}

const _api = {
  getPressedKeyString,
  setScope,
  getScope,
  deleteScope,
  getPressedKeyCodes,
  isPressed,
  filter,
  trigger,
  unbind,
  keyMap: _keyMap,
  modifier: _modifier,
  modifierMap
}

for (const a in _api) {
  if (Object.prototype.hasOwnProperty.call(_api, a)) {
    hotkeys[a] = _api[a]
  }
}

if (typeof window !== 'undefined') {
  const _hotkeys = window.hotkeys
  hotkeys.noConflict = function (deep) {
    if (deep && window.hotkeys === hotkeys) {
      window.hotkeys = _hotkeys
    }
    return hotkeys
  }
  window.hotkeys = hotkeys
}

class DebounceController extends Controller {}

DebounceController.debounces = []

const defaultWait$1 = 200

const debounce = (fn, wait = defaultWait$1) => {
  let timeoutId = null
  return function () {
    const args = arguments
    const context = this
    const callback = () => fn.apply(context, args)
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(callback, wait)
  }
}

const useDebounce = (composableController, options) => {
  const controller = composableController
  const constructor = controller.constructor
  constructor.debounces.forEach(func => {
    if (typeof func === 'string') {
      controller[func] = debounce(controller[func], options === null || options === void 0 ? void 0 : options.wait)
    }
    if (typeof func === 'object') {
      const { name, wait } = func
      if (!name) return
      controller[name] = debounce(controller[name], wait || (options === null || options === void 0 ? void 0 : options.wait))
    }
  })
}

class ThrottleController extends Controller {}

ThrottleController.throttles = []

class FormController extends Controller {
  static targets = ['submitButton', 'radioButton', 'optionTypeContainer']
  static values = {
    delay: {
      default: 0,
      type: Number
    }
  }

  static debounces = [{
    name: 'submitViaClick'
  }]

  initialize () {
    this.submitViaClick = this.submitViaClick.bind(this)
  }

  connect () {
    useDebounce(this, {
      wait: this.delayValue
    })
    if (this.hasSubmitButtonTarget) this.submitButtonTarget.style.display = 'none'
  }

  submitViaClick (event) {
    this.submitButtonTarget.click()
  }

  submitWithNearestSubmitButton (event) {
    this.submitButtonTarget.click()
  }

  removeSelection (event) {
    this.radioButtonTargets.forEach(input => {
      if (input.dataset.radioIndexValue >= event.target.dataset.radioIndexValue) {
        input.checked = false
      }
    })
  }

  resetRadiosWithHigherIndex (event) {
    this.radioButtonTargets.forEach(input => {
      if (input.dataset.radioIndexValue > event.target.dataset.radioIndexValue) {
        input.checked = false
        input.disabled = true
      }
    })
  }

  optionContainterCheck (event) {
    this.optionTypeContainerTargets.forEach(container => {
      const checkedOption = container.querySelector('input[type="radio"]:checked')
      if (checkedOption) {
        const resetFormBtn = container.querySelector('.reset-selection')
        if (resetFormBtn) resetFormBtn.style.display = 'block'
      }
    })
  }
}

class ModalController extends Controller {
  connect () {
    if (document.documentElement.hasAttribute('data-turbo-preview')) {
      const modalBackdrop = document.querySelector('.modal-backdrop')
      if (modalBackdrop) modalBackdrop.remove()
      return
    }
    this.modal = new bootstrap.Modal(this.element, {
      keyboard: false
    })
    this.modal.show()
  }

  disconnect () {
    if (this.modal) this.modal.dispose()
  }

  submitEnd (event) {
    if (event.detail.formSubmission.submitter.formNoValidate === true) return
    if (event.detail.success) this.modal.hide()
  }
}

class MicroFormController extends Controller {
  static targets = ['submitButton', 'radioButton', 'optionTypeContainer']
  static values = {
    delay: {
      default: 0,
      type: Number
    }
  }

  static debounces = [{
    name: 'submitViaClick'
  }]

  initialize () {
    this.submitViaClick = this.submitViaClick.bind(this)
  }

  connect () {
    useDebounce(this, {
      wait: this.delayValue
    })
    if (this.hasSubmitButtonTarget) this.submitButtonTarget.style.display = 'none'
  }

  submitViaClick (event) {
    this.submitButtonTarget.click()
  }
}

window.Stimulus = Application.start()

Stimulus.register('bs-instance', BsInstanceController)

Stimulus.register('form', FormController)

Stimulus.register('modal', ModalController)

Stimulus.register('micro-form', MicroFormController)

const AypexStorefront = {}

if (!window.AypexStorefront) {
  window.AypexStorefront = AypexStorefront
}

const platformApiMountedAt = function () {
  return window.AypexStorefront.paths.platform_api_mounted_at
}

const pathFor = function (path) {
  const locationOrigin = window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : '')
  const queryParts = window.location.search
  const uri = `${locationOrigin + platformApiMountedAt() + path + queryParts}`
  return uri
}

AypexStorefront.localizedPathFor = function (path) {
  const defaultLocale = this.localization.default_locale
  const currentLocale = this.localization.current_locale
  const defaultCurrency = this.localization.default_currency
  const currentCurrency = this.localization.current_currency
  if (defaultLocale !== currentLocale || defaultCurrency !== currentCurrency) {
    const fullUrl = new URL(pathFor(path))
    const params = fullUrl.searchParams
    const pathName = fullUrl.pathname
    params.set('locale', currentLocale)
    params.set('currency', currentCurrency)
    return fullUrl.origin + pathName + '?' + params.toString()
  }
  return pathFor(path)
}

console.log('Aypex Storefront Initialized')

const adapters = {
  logger: self.console,
  WebSocket: self.WebSocket
}

const logger = {
  log (...messages) {
    if (this.enabled) {
      messages.push(Date.now())
      adapters.logger.log('[ActionCable]', ...messages)
    }
  }
}

const now = () => (new Date()).getTime()

const secondsSince = time => (now() - time) / 1e3

class ConnectionMonitor {
  constructor (connection) {
    this.visibilityDidChange = this.visibilityDidChange.bind(this)
    this.connection = connection
    this.reconnectAttempts = 0
  }

  start () {
    if (!this.isRunning()) {
      this.startedAt = now()
      delete this.stoppedAt
      this.startPolling()
      addEventListener('visibilitychange', this.visibilityDidChange)
      logger.log(`ConnectionMonitor started. stale threshold = ${this.constructor.staleThreshold} s`)
    }
  }

  stop () {
    if (this.isRunning()) {
      this.stoppedAt = now()
      this.stopPolling()
      removeEventListener('visibilitychange', this.visibilityDidChange)
      logger.log('ConnectionMonitor stopped')
    }
  }

  isRunning () {
    return this.startedAt && !this.stoppedAt
  }

  recordPing () {
    this.pingedAt = now()
  }

  recordConnect () {
    this.reconnectAttempts = 0
    this.recordPing()
    delete this.disconnectedAt
    logger.log('ConnectionMonitor recorded connect')
  }

  recordDisconnect () {
    this.disconnectedAt = now()
    logger.log('ConnectionMonitor recorded disconnect')
  }

  startPolling () {
    this.stopPolling()
    this.poll()
  }

  stopPolling () {
    clearTimeout(this.pollTimeout)
  }

  poll () {
    this.pollTimeout = setTimeout(() => {
      this.reconnectIfStale()
      this.poll()
    }, this.getPollInterval())
  }

  getPollInterval () {
    const { staleThreshold, reconnectionBackoffRate } = this.constructor
    const backoff = Math.pow(1 + reconnectionBackoffRate, Math.min(this.reconnectAttempts, 10))
    const jitterMax = this.reconnectAttempts === 0 ? 1 : reconnectionBackoffRate
    const jitter = jitterMax * Math.random()
    return staleThreshold * 1e3 * backoff * (1 + jitter)
  }

  reconnectIfStale () {
    if (this.connectionIsStale()) {
      logger.log(`ConnectionMonitor detected stale connection. reconnectAttempts = ${this.reconnectAttempts}, time stale = ${secondsSince(this.refreshedAt)} s, stale threshold = ${this.constructor.staleThreshold} s`)
      this.reconnectAttempts++
      if (this.disconnectedRecently()) {
        logger.log(`ConnectionMonitor skipping reopening recent disconnect. time disconnected = ${secondsSince(this.disconnectedAt)} s`)
      } else {
        logger.log('ConnectionMonitor reopening')
        this.connection.reopen()
      }
    }
  }

  get refreshedAt () {
    return this.pingedAt ? this.pingedAt : this.startedAt
  }

  connectionIsStale () {
    return secondsSince(this.refreshedAt) > this.constructor.staleThreshold
  }

  disconnectedRecently () {
    return this.disconnectedAt && secondsSince(this.disconnectedAt) < this.constructor.staleThreshold
  }

  visibilityDidChange () {
    if (document.visibilityState === 'visible') {
      setTimeout(() => {
        if (this.connectionIsStale() || !this.connection.isOpen()) {
          logger.log(`ConnectionMonitor reopening stale connection on visibilitychange. visibilityState = ${document.visibilityState}`)
          this.connection.reopen()
        }
      }, 200)
    }
  }
}

ConnectionMonitor.staleThreshold = 6

ConnectionMonitor.reconnectionBackoffRate = 0.15

const ConnectionMonitor$1 = ConnectionMonitor

const INTERNAL = {
  message_types: {
    welcome: 'welcome',
    disconnect: 'disconnect',
    ping: 'ping',
    confirmation: 'confirm_subscription',
    rejection: 'reject_subscription'
  },
  disconnect_reasons: {
    unauthorized: 'unauthorized',
    invalid_request: 'invalid_request',
    server_restart: 'server_restart'
  },
  default_mount_path: '/cable',
  protocols: ['actioncable-v1-json', 'actioncable-unsupported']
}

const { message_types, protocols } = INTERNAL

const supportedProtocols = protocols.slice(0, protocols.length - 1)

const indexOf = [].indexOf

class Connection {
  constructor (consumer) {
    this.open = this.open.bind(this)
    this.consumer = consumer
    this.subscriptions = this.consumer.subscriptions
    this.monitor = new ConnectionMonitor$1(this)
    this.disconnected = true
  }

  send (data) {
    if (this.isOpen()) {
      this.webSocket.send(JSON.stringify(data))
      return true
    } else {
      return false
    }
  }

  open () {
    if (this.isActive()) {
      logger.log(`Attempted to open WebSocket, but existing socket is ${this.getState()}`)
      return false
    } else {
      logger.log(`Opening WebSocket, current state is ${this.getState()}, subprotocols: ${protocols}`)
      if (this.webSocket) {
        this.uninstallEventHandlers()
      }
      this.webSocket = new adapters.WebSocket(this.consumer.url, protocols)
      this.installEventHandlers()
      this.monitor.start()
      return true
    }
  }

  close ({ allowReconnect } = {
    allowReconnect: true
  }) {
    if (!allowReconnect) {
      this.monitor.stop()
    }
    if (this.isOpen()) {
      return this.webSocket.close()
    }
  }

  reopen () {
    logger.log(`Reopening WebSocket, current state is ${this.getState()}`)
    if (this.isActive()) {
      try {
        return this.close()
      } catch (error) {
        logger.log('Failed to reopen WebSocket', error)
      } finally {
        logger.log(`Reopening WebSocket in ${this.constructor.reopenDelay}ms`)
        setTimeout(this.open, this.constructor.reopenDelay)
      }
    } else {
      return this.open()
    }
  }

  getProtocol () {
    if (this.webSocket) {
      return this.webSocket.protocol
    }
  }

  isOpen () {
    return this.isState('open')
  }

  isActive () {
    return this.isState('open', 'connecting')
  }

  isProtocolSupported () {
    return indexOf.call(supportedProtocols, this.getProtocol()) >= 0
  }

  isState (...states) {
    return indexOf.call(states, this.getState()) >= 0
  }

  getState () {
    if (this.webSocket) {
      for (const state in adapters.WebSocket) {
        if (adapters.WebSocket[state] === this.webSocket.readyState) {
          return state.toLowerCase()
        }
      }
    }
    return null
  }

  installEventHandlers () {
    for (const eventName in this.events) {
      const handler = this.events[eventName].bind(this)
      this.webSocket[`on${eventName}`] = handler
    }
  }

  uninstallEventHandlers () {
    for (const eventName in this.events) {
      this.webSocket[`on${eventName}`] = function () {}
    }
  }
}

Connection.reopenDelay = 500

Connection.prototype.events = {
  message (event) {
    if (!this.isProtocolSupported()) {
      return
    }
    const { identifier, message, reason, reconnect, type } = JSON.parse(event.data)
    switch (type) {
      case message_types.welcome:
        this.monitor.recordConnect()
        return this.subscriptions.reload()

      case message_types.disconnect:
        logger.log(`Disconnecting. Reason: ${reason}`)
        return this.close({
          allowReconnect: reconnect
        })

      case message_types.ping:
        return this.monitor.recordPing()

      case message_types.confirmation:
        this.subscriptions.confirmSubscription(identifier)
        return this.subscriptions.notify(identifier, 'connected')

      case message_types.rejection:
        return this.subscriptions.reject(identifier)

      default:
        return this.subscriptions.notify(identifier, 'received', message)
    }
  },
  open () {
    logger.log(`WebSocket onopen event, using '${this.getProtocol()}' subprotocol`)
    this.disconnected = false
    if (!this.isProtocolSupported()) {
      logger.log('Protocol is unsupported. Stopping monitor and disconnecting.')
      return this.close({
        allowReconnect: false
      })
    }
  },
  close (event) {
    logger.log('WebSocket onclose event')
    if (this.disconnected) {
      return
    }
    this.disconnected = true
    this.monitor.recordDisconnect()
    return this.subscriptions.notifyAll('disconnected', {
      willAttemptReconnect: this.monitor.isRunning()
    })
  },
  error () {
    logger.log('WebSocket onerror event')
  }
}

const Connection$1 = Connection

const extend = function (object, properties) {
  if (properties != null) {
    for (const key in properties) {
      const value = properties[key]
      object[key] = value
    }
  }
  return object
}

class Subscription {
  constructor (consumer, params = {}, mixin) {
    this.consumer = consumer
    this.identifier = JSON.stringify(params)
    extend(this, mixin)
  }

  perform (action, data = {}) {
    data.action = action
    return this.send(data)
  }

  send (data) {
    return this.consumer.send({
      command: 'message',
      identifier: this.identifier,
      data: JSON.stringify(data)
    })
  }

  unsubscribe () {
    return this.consumer.subscriptions.remove(this)
  }
}

class SubscriptionGuarantor {
  constructor (subscriptions) {
    this.subscriptions = subscriptions
    this.pendingSubscriptions = []
  }

  guarantee (subscription) {
    if (this.pendingSubscriptions.indexOf(subscription) == -1) {
      logger.log(`SubscriptionGuarantor guaranteeing ${subscription.identifier}`)
      this.pendingSubscriptions.push(subscription)
    } else {
      logger.log(`SubscriptionGuarantor already guaranteeing ${subscription.identifier}`)
    }
    this.startGuaranteeing()
  }

  forget (subscription) {
    logger.log(`SubscriptionGuarantor forgetting ${subscription.identifier}`)
    this.pendingSubscriptions = this.pendingSubscriptions.filter(s => s !== subscription)
  }

  startGuaranteeing () {
    this.stopGuaranteeing()
    this.retrySubscribing()
  }

  stopGuaranteeing () {
    clearTimeout(this.retryTimeout)
  }

  retrySubscribing () {
    this.retryTimeout = setTimeout(() => {
      if (this.subscriptions && typeof this.subscriptions.subscribe === 'function') {
        this.pendingSubscriptions.map(subscription => {
          logger.log(`SubscriptionGuarantor resubscribing ${subscription.identifier}`)
          this.subscriptions.subscribe(subscription)
        })
      }
    }, 500)
  }
}

const SubscriptionGuarantor$1 = SubscriptionGuarantor

class Subscriptions {
  constructor (consumer) {
    this.consumer = consumer
    this.guarantor = new SubscriptionGuarantor$1(this)
    this.subscriptions = []
  }

  create (channelName, mixin) {
    const channel = channelName
    const params = typeof channel === 'object'
      ? channel
      : {
          channel
        }
    const subscription = new Subscription(this.consumer, params, mixin)
    return this.add(subscription)
  }

  add (subscription) {
    this.subscriptions.push(subscription)
    this.consumer.ensureActiveConnection()
    this.notify(subscription, 'initialized')
    this.subscribe(subscription)
    return subscription
  }

  remove (subscription) {
    this.forget(subscription)
    if (!this.findAll(subscription.identifier).length) {
      this.sendCommand(subscription, 'unsubscribe')
    }
    return subscription
  }

  reject (identifier) {
    return this.findAll(identifier).map(subscription => {
      this.forget(subscription)
      this.notify(subscription, 'rejected')
      return subscription
    })
  }

  forget (subscription) {
    this.guarantor.forget(subscription)
    this.subscriptions = this.subscriptions.filter(s => s !== subscription)
    return subscription
  }

  findAll (identifier) {
    return this.subscriptions.filter(s => s.identifier === identifier)
  }

  reload () {
    return this.subscriptions.map(subscription => this.subscribe(subscription))
  }

  notifyAll (callbackName, ...args) {
    return this.subscriptions.map(subscription => this.notify(subscription, callbackName, ...args))
  }

  notify (subscription, callbackName, ...args) {
    let subscriptions
    if (typeof subscription === 'string') {
      subscriptions = this.findAll(subscription)
    } else {
      subscriptions = [subscription]
    }
    return subscriptions.map(subscription => typeof subscription[callbackName] === 'function' ? subscription[callbackName](...args) : undefined)
  }

  subscribe (subscription) {
    if (this.sendCommand(subscription, 'subscribe')) {
      this.guarantor.guarantee(subscription)
    }
  }

  confirmSubscription (identifier) {
    logger.log(`Subscription confirmed ${identifier}`)
    this.findAll(identifier).map(subscription => this.guarantor.forget(subscription))
  }

  sendCommand (subscription, command) {
    const { identifier } = subscription
    return this.consumer.send({
      command,
      identifier
    })
  }
}

class Consumer {
  constructor (url) {
    this._url = url
    this.subscriptions = new Subscriptions(this)
    this.connection = new Connection$1(this)
  }

  get url () {
    return createWebSocketURL(this._url)
  }

  send (data) {
    return this.connection.send(data)
  }

  connect () {
    return this.connection.open()
  }

  disconnect () {
    return this.connection.close({
      allowReconnect: false
    })
  }

  ensureActiveConnection () {
    if (!this.connection.isActive()) {
      return this.connection.open()
    }
  }
}

function createWebSocketURL (url) {
  if (typeof url === 'function') {
    url = url()
  }
  if (url && !/^wss?:/i.test(url)) {
    const a = document.createElement('a')
    a.href = url
    a.href = a.href
    a.protocol = a.protocol.replace('http', 'ws')
    return a.href
  } else {
    return url
  }
}

function createConsumer (url = getConfig('url') || INTERNAL.default_mount_path) {
  return new Consumer(url)
}

function getConfig (name) {
  const element = document.head.querySelector(`meta[name='action-cable-${name}']`)
  if (element) {
    return element.getAttribute('content')
  }
}

var index = Object.freeze({
  __proto__: null,
  Connection: Connection$1,
  ConnectionMonitor: ConnectionMonitor$1,
  Consumer,
  INTERNAL,
  Subscription,
  Subscriptions,
  SubscriptionGuarantor: SubscriptionGuarantor$1,
  adapters,
  createWebSocketURL,
  logger,
  createConsumer,
  getConfig
})