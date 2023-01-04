require_relative 'configuration'

module Aypex
  module Storefront
    class Engine < Rails::Engine
      isolate_namespace Aypex
      engine_name "aypex_storefront"

      config.middleware.use 'Aypex::Storefront::Middleware::SeoAssist'

      # Prevent XSS but allow text formatting
      config.action_view.sanitized_allowed_tags = %w(a b del em i ins mark p small strong sub sup)
      config.action_view.sanitized_allowed_attributes = %w(href)

      # sets the manifests / assets to be pre-compiled, even when initialize_on_precompile is false
      initializer 'aypex.assets.precompile', group: :all do |app|
        app.config.assets.precompile += %w[
          aypex/storefront/all*
        ]
      end

      initializer 'aypex.storefront.environment', before: :load_config_initializers do |_app|
        Aypex::Storefront::Config = Aypex::Storefront::Configuration.new
      end
    end
  end
end
