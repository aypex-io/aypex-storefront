// import Uri from 'jsuri'

// const AypexStorefront = {}

// if (!window.AypexStorefront) { window.AypexStorefront = AypexStorefront }

// AypexStorefront.mountedAt = function () { return window.AypexPaths.mounted_at }
// AypexStorefront.adminPath = function () { return window.AypexPaths.admin }

// AypexStorefront.pathFor = function (path) {
//   const locationOrigin = window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : '')
//   return this.url('' + locationOrigin + this.mountedAt() + path, this.url_params).toString()
// }
const AypexStorefront = {}

if (!window.AypexStorefront) { window.AypexStorefront = AypexStorefront }

const platformApiMountedAt = function () { return window.AypexStorefront.paths.platform_api_mounted_at }

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
