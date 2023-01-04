module Aypex
  module CacheHelper
    def http_cache_enabled?
      @http_cache_enabled ||= Aypex::Storefront::Config[:http_cache_enabled]
    end
  end
end
