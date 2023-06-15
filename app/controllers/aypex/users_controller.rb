module Aypex
  class UsersController < Aypex::StoreController
    before_action :set_current_order, except: :show
    prepend_before_action :authorize_actions, only: :new

    include Aypex::ControllerHelpers

    def show
      load_object
      @orders = @user.orders.for_store(current_store).complete.order("completed_at desc")
    end

    def edit
      load_object
    end

    def create
      @user = Aypex::Config.user_class.new(user_params)
      if @user.save
        redirect_back_or_default(root_url)
      else
        render :new
      end
    end

    def update
      load_object
      if @user.update(user_params)
        if params[:user][:password].present?
          # this logic needed b/c devise wants to log us out after password changes
          Aypex::Config.user_class.reset_password_by_token(params[:user])
          if Aypex::Auth::Config.signout_after_password_change
            sign_in(@user, event: :authentication)
          else
            bypass_sign_in(@user)
          end
        end

        redirect_to aypex.account_path, notice: I18n.t("aypex.auth.account_updated")
      else
        render :edit
      end
    end

    private

    def user_params
      user_params = params.require(:user).permit(Aypex::PermittedAttributes.user_attributes)
      user_params[:store_id] = current_store.id
      user_params
    end

    def load_object
      @user ||= try_aypex_current_user
      authorize! params[:action].to_sym, @user
    end

    def authorize_actions
      authorize! params[:action].to_sym, Aypex::Config.user_class.new
    end

    def accurate_title
      I18n.t("aypex.auth.my_account")
    end
  end
end
