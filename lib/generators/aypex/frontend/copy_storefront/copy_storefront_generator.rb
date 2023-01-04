module Aypex
  module Frontend
    class CopyStorefrontGenerator < Rails::Generators::Base
      desc 'Copies all storefront views and stylesheets from aypex frontend to your application'

      def self.source_paths
        [File.expand_path('../../../../../app', __dir__)]
      end

      def copy_storefront
        directory 'views', './app/views'
      end
    end
  end
end
