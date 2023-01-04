module Aypex
  class CmsPagesController < Aypex::StoreController
    before_action :load_cms_page, only: [:show]

    include Aypex::StorefrontHelper
    include Aypex::CacheHelper

    def show
      if @page&.visible?
        @cms_page = @page
      elsif @page&.draft_mode? && try_aypex_current_user&.admin?
        @cms_page = @page
        @edit_mode = true
      else
        raise ActiveRecord::RecordNotFound
      end
    end

    private

    def accurate_title
      @page&.seo_title || super
    end

    def load_cms_page
      @page = Aypex::CmsPage.for_store(current_store).by_locale(I18n.locale).find_by(slug: params[:slug])
    end
  end
end
