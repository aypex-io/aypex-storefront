Rails.application.config.assets.precompile << "aypex_storefront_manifest.js"

Rails.application.config.assets.configure do |env|
  env.export_concurrent = false
end
