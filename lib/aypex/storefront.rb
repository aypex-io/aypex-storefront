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
    # Used to configure Aypex Admin.
    #
    # Example:
    #   Aypex::Storefront.configure do |config|
    #     config.always_put_site_name_in_title = true
    #   end
    def self.configure
      yield(Aypex::Storefront::Config)
    end
  end
end
