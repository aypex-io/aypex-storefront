# Make redirects for SEO needs
module Aypex
  module Storefront
    module Middleware
      class SeoAssist
        def initialize(app)
          @app = app
        end

        def call(env)
          request = Rack::Request.new(env)
          params = request.params

          category_id = params["category"]

          # redirect requests using category id's to their permalinks
          if !category_id.blank? && !category_id.is_a?(Hash) && (category = Category.find(category_id))
            params.delete("category")

            return build_response(params, "#{request.script_name}t/#{category.permalink}")
          elsif /^\/(t|products)(\/\S+)?\/$/.match?(env["PATH_INFO"])
            # ensures no trailing / for category and product url

            return build_response(params, env["PATH_INFO"][0...-1])
          end

          @app.call(env)
        end

        private

        def build_response(params, location)
          query = build_query(params)
          location += "?" + query unless query.blank?
          [301, {"Location" => location}, []]
        end

        def build_query(params)
          params.map do |k, v|
            if v.instance_of?(Array)
              build_query(v.map { |x| ["#{k}[]", x] })
            else
              k + "=" + Rack::Utils.escape(v)
            end
          end.join("&")
        end
      end
    end
  end
end
