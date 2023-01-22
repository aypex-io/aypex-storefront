module Aypex
  module Storefront
    module CategoryHelper
      # Retrieves the collection of products to display when "previewing" a category.  This is abstracted into a helper so
      # that we can use configurations as well as make it easier for end users to override this determination.  One idea is
      # to show the most popular products for a particular category (that is an exercise left to the developer.)
      def category_preview(category, max = 4)
        ActiveSupport::Deprecation.warn(<<-DEPRECATION, caller)
          CategoriesHelper is deprecated and will be removed in Aypex 5.0.
          Please remove any `helper 'aypex/categories'` from your controllers.
        DEPRECATION
        products = category.active_products.distinct.select("aypex_products.*, aypex_products_categories.position").limit(max)
        if products.size < max
          products_arel = Aypex::Product.arel_table
          category.descendants.each do |child|
            to_get = max - products.length
            products += child.active_products.distinct.select("aypex_products.*, aypex_products_categories.position").where(products_arel[:id].not_in(products.map(&:id))).limit(to_get)
            break if products.size >= max
          end
        end
        products
      end
    end
  end
end
