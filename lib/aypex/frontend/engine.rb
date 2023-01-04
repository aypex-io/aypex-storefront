require_relative 'configuration'

module Aypex
  module Frontend
    class Engine < ::Rails::Engine
      config.middleware.use 'Aypex::Frontend::Middleware::SeoAssist'

      # Prevent XSS but allow text formatting
      config.action_view.sanitized_allowed_tags = %w(a b del em i ins mark p small strong sub sup)
      config.action_view.sanitized_allowed_attributes = %w(href)

      # sets the manifests / assets to be precompiled, even when initialize_on_precompile is false
      initializer 'aypex.assets.precompile', group: :all do |app|
        app.config.assets.precompile += %w[
          aypex/frontend/all*
        ]
      end

      initializer 'aypex.frontend.environment', before: :load_config_initializers do |_app|
        Aypex::Frontend::Config = Aypex::Frontend::Configuration.new
      end
    end
  end
end
