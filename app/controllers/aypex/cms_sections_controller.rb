module Aypex
  class CmsSectionsController < Aypex::StoreController
    before_action :load_cms_section, only: [:show]

    include Aypex::Storefront::StorefrontHelper
    include Aypex::Storefront::CacheHelper

    layout "aypex/layouts/aypex_section_editor"

    def show
      if try_aypex_current_user&.admin?
        @cms_section = @section
        @edit_mode = true
      else
        raise ActiveRecord::RecordNotFound
      end
    end

    private

    def accurate_title
      "Aypex Admin Section Edit Mode"
    end

    def load_cms_section
      @section = Aypex::CmsSection.for_store(current_store).find(params[:id])
    end
  end
end
