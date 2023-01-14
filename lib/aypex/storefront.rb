require "aypex"
require "aypex/api"
require "aypex/storefront/engine"

require "inline_svg"
require "canonical-rails"
require "turbo-rails"
require "responders"

require "aypex/storefront/middleware/seo_assist"

module Aypex
  module Storefront
    class << self
      def configuration
        @configuration ||= Configuration.new
      end

      alias_method :config, :configuration

      def configure
        yield configuration
      end
    end
  end
end
