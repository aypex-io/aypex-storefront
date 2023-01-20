module Aypex
  class AddressesController < Aypex::StoreController
    load_and_authorize_resource class: Aypex::Address

    def create
      @address = try_aypex_current_user.addresses.build(address_params)
      if create_service.call(user: try_aypex_current_user, address_params: @address.attributes).success?
        flash[:notice] = I18n.t("aypex.storefront.address_book.successfully_created")
        redirect_to aypex.account_path
      else
        render action: "new", status: :unprocessable_entity
      end
    end

    def edit
      session["aypex_user_return_to"] = request.env["HTTP_REFERER"]
    end

    def new
      @address = Aypex::Address.new(country: current_store.default_country, user: try_aypex_current_user)
    end

    def update
      if update_service.call(address: @address, address_params: address_params).success?
        flash[:notice] = I18n.t("aypex.storefront.address_book.successfully_updated")
        redirect_back_or_default(addresses_path)
      else
        render :edit, status: :unprocessable_entity
      end
    end

    def destroy
      @address.destroy

      flash[:notice] = I18n.t("aypex.storefront.address_book.successfully_removed")
      redirect_to(request.env["HTTP_REFERER"] || addresses_path) unless request.xhr?
    end

    private

    def address_params
      params.require(:address).permit(permitted_address_attributes)
    end

    def create_service
      Aypex::Dependency.address_create_service.constantize
    end

    def update_service
      Aypex::Dependency.address_update_service.constantize
    end
  end
end
