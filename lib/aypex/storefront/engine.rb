require_relative "configuration"

module Aypex
  module Storefront
    class Engine < Rails::Engine
      isolate_namespace Aypex
      engine_name "aypex_storefront"

      initializer "aypex.storefront.environment", before: :load_config_initializers do |_app|
        Aypex::Storefront::Config = Aypex::Storefront::Configuration.new
      end

      def self.admin_available?
        @admin_available ||= ::Rails::Engine.subclasses.map(&:instance).map { |e| e.class.to_s }.include?("Aypex::Admin::Engine")
      end

      def self.api_available?
        @api_available ||= ::Rails::Engine.subclasses.map(&:instance).map { |e| e.class.to_s }.include?("Aypex::Api::Engine")
      end

      def self.checkout_available?
        @checkout_available ||= ::Rails::Engine.subclasses.map(&:instance).map { |e| e.class.to_s }.include?("Aypex::Checkout::Engine")
      end

      def self.cli_available?
        @cli_available ||= ::Rails::Engine.subclasses.map(&:instance).map { |e| e.class.to_s }.include?("Aypex::Cli::Engine")
      end

      def self.emails_available?
        @emails_available ||= ::Rails::Engine.subclasses.map(&:instance).map { |e| e.class.to_s }.include?("Aypex::Emails::Engine")
      end

      def self.sample_available?
        @sample_available ||= ::Rails::Engine.subclasses.map(&:instance).map { |e| e.class.to_s }.include?("AypexSample::Engine")
      end

      config.middleware.use "Aypex::Storefront::Middleware::SeoAssist"

      # Prevent XSS but allow text formatting
      config.action_view.sanitized_allowed_tags = %w[a b del em i ins mark p small strong sub sup]
      config.action_view.sanitized_allowed_attributes = %w[href]
    end
  end
end
