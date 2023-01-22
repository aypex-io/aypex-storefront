module Aypex
  module Storefront
    module Generators
      class InstallGenerator < Rails::Generators::Base
        desc "Installs Aypex Rails Storefront"

        def self.source_paths
          [
            File.expand_path("templates", __dir__),
            File.expand_path("../templates", "../#{__FILE__}"),
            File.expand_path("../templates", "../../#{__FILE__}")
          ]
        end

        def install
          template "app/assets/config/manifest.js", force: true if Rails.env == "test"

          unless ENV["AYPEX_STOREFRONT_SKIP_INSTALL_NODE_JS_FILES"] == "true"
            template "app/javascript/aypex_storefront.js"
            template "vendor/assets/stylesheets/aypex/storefront/all.css"
          end
        end
      end
    end
  end
end
