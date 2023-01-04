module Aypex
  class OrdersController < Aypex::StoreController
    before_action :ensure_order, except: [:show, :edit, :empty, :update]
    before_action :set_current_order
    before_action :check_authorization

    helper 'aypex/products', 'aypex/orders'

    before_action :assign_order_with_lock, only: :update

    def show
      @order = current_store.orders.includes(line_items: [variant: [:option_values, :images, :product]], bill_address: :state,
                                             ship_address: :state).find_by!(number: params[:id])
    end

    def add_to_cart
      @variant = current_store.variants.find(params[:variant_id]) if params[:variant_id]

      if cart_add_item_service.call(order: @order, variant: @variant, quantity: params[:quantity]).success?
        respond_with(@variant) do |format|
          format.turbo_stream {}
        end
      end
    end

    def set_item_quantity
      line_item = @order.line_items.find(params[:id])

      if params[:quantity].present? && params[:quantity].to_i > 0
        if cart_set_item_quantity_service.call(order: @order, line_item: line_item, quantity: params[:quantity]).success?
          respond_with(@order) do |format|
            format.turbo_stream { render :update }
          end
        end
      elsif cart_remove_line_item_service.call(order: @order, line_item: line_item).success?
        respond_with(@order) do |format|
          format.turbo_stream { render :update }
        end
      end
    end

    def update
      @variant = current_store.variants.find(params[:variant_id]) if params[:variant_id]

      if Cart::Update.call(order: @order, params: order_params).success?
        respond_with(@order) do |format|
          format.turbo_stream do
            if params.key?(:checkout)
              @order.next if @order.cart?
              redirect_to aypex.checkout_state_path(@order.checkout_steps.first)
            end
          end
        end
      else
        respond_with(@order, status: :unprocessable_entity)
      end
    end

    # Shows the current incomplete order from the session
    def edit
      @order = current_order || current_store.orders.incomplete.
               includes(line_items: [variant: [:images, :product, { option_values: :option_type }]]).
               find_or_initialize_by(token: cookies.signed[:token])

      associate_user
    end

    def empty
      cart_empty_service.call(order: current_order)
      redirect_to aypex.cart_path
    end

    def apply_coupon
      current_order.coupon_code = params[:coupon_code]
      @result = coupon_handler.new(current_order).apply

      respond_with(@order) do |format|
        format.turbo_stream { render :update }
      end
    end

    def remove_coupon
      current_order.coupon_code = params[:coupon_code]
      @result = coupon_handler.new(current_order).remove(params[:coupon_code])

      respond_with(@order) do |format|
        format.turbo_stream { render :update }
      end
    end

    private

    def ensure_order
      @order ||= current_order(create_order_if_necessary: true)
    end

    def accurate_title
      if @order&.completed?
        Aypex.t(:order_number, number: @order.number)
      else
        Aypex.t(:shopping_cart)
      end
    end

    def check_authorization
      order = current_store.orders.find_by(number: params[:id]) if params[:id].present?
      order ||= current_order

      if order && action_name.to_sym == :show
        authorize! :show, order, cookies.signed[:token]
      elsif order
        authorize! :edit, order, cookies.signed[:token]
      else
        authorize! :create, Aypex::Order
      end
    end

    def order_params
      if params[:order]
        params[:order].permit(*permitted_order_attributes)
      else
        {}
      end
    end

    def assign_order_with_lock
      @order = current_order(lock: true)
      unless @order
        flash[:error] = Aypex.t(:order_not_found)
        redirect_to root_path and return
      end
    end

    # Service Calls
    def create_order_service
      Aypex::Dependencies.cart_create_service.constantize
    end

    def cart_add_item_service
      Aypex::Dependencies.cart_add_item_service.constantize
    end

    def cart_remove_line_item_service
      Aypex::Dependencies.cart_remove_line_item_service.constantize
    end

    def cart_empty_service
      Aypex::Dependencies.cart_empty_service.constantize
    end

    def cart_set_item_quantity_service
      Aypex::Dependencies.cart_set_item_quantity_service.constantize
    end

    def coupon_handler
      Aypex::PromotionHandler::Coupon
    end
  end
end
