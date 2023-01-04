module Aypex
  class StoreController < ApplicationController
    include Aypex::Core::ControllerHelpers::Auth
    include Aypex::Core::ControllerHelpers::Search
    include Aypex::Core::ControllerHelpers::Store
    include Aypex::Core::ControllerHelpers::StrongParameters
    include Aypex::Core::ControllerHelpers::Locale
    include Aypex::Core::ControllerHelpers::Currency
    include Aypex::Core::ControllerHelpers::Order
    include Aypex::LocaleUrls

    respond_to :html

    layout :get_layout

    helper 'aypex/base'
    helper 'aypex/locale'
    helper 'aypex/currency'

    helper_method :title
    helper_method :title=
    helper_method :accurate_title

    skip_before_action :verify_authenticity_token, only: :ensure_cart, raise: false

    before_action :redirect_to_default_locale

    def account_link
      render partial: 'aypex/shared/link_to_account'
      fresh_when(etag: [try_aypex_current_user, I18n.locale])
    end

    def cart_link
      render partial: 'aypex/shared/link_to_cart'
      fresh_when(etag: [simple_current_order, I18n.locale])
    end

    def api_tokens
      render json: {
        order_token: simple_current_order&.token,
        oauth_token: current_oauth_token&.token
      }
    end

    def ensure_cart
      render json: current_order(create_order_if_necessary: true) # force creation of order if doesn't exists
    end

    protected

    # can be used in views as well as controllers.
    # e.g. <% self.title = 'This is a custom title for this view' %>
    attr_writer :title

    def title
      title_string = @title.present? ? @title : accurate_title
      if title_string.present?
        if Aypex::Frontend::Config[:always_put_site_name_in_title] && !title_string.include?(default_title)
          [title_string, default_title].join(" #{Aypex::Frontend::Config[:title_site_name_separator]} ")
        else
          title_string
        end
      else
        default_title
      end
    end

    def default_title
      current_store.name
    end

    # this is a hook for subclasses to provide title
    def accurate_title
      current_store.seo_title
    end

    def config_locale
      Aypex::Frontend::Config[:locale]
    end

    # Returns which layout to render.
    #
    # You can set the layout you want to render inside your Aypex configuration with the +:layout+ option.
    #
    # Default layout is: +app/views/aypex/layouts/aypex_application+
    #
    def get_layout
      layout ||= Aypex::Frontend::Config[:layout]
    end

    def store_etag
      [
        current_store,
        current_currency,
        I18n.locale,
        try_aypex_current_user.present?,
        try_aypex_current_user.try(:has_aypex_role?, 'admin')
      ].compact
    end

    def store_last_modified
      (current_store.updated_at || Time.current).utc
    end

    def redirect_unauthorized_access
      if try_aypex_current_user
        flash[:error] = Aypex.t(:authorization_failure)
        redirect_to aypex.forbidden_path
      else
        store_location
        if respond_to?(:aypex_login_path)
          redirect_to aypex_login_path
        else
          redirect_to aypex.root_path
        end
      end
    end
  end
end
