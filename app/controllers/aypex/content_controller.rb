module Aypex
  class ContentController < Aypex::StoreController
    # Don't serve local files or static assets
    after_action :fire_visited_path, except: :cvv

    def test
    end

    def cvv
      render layout: false
    end

    def fire_visited_path
      Aypex::PromotionHandler::Page.new(current_order, params[:action]).activate
    end
  end
end
