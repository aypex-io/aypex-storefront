module Aypex
  module Storefront
    module OrderHelper
      def order_just_completed?(order)
        flash[:order_completed] && order.present?
      end
    end
  end
end
