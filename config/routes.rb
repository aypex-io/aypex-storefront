Aypex::Engine.add_routes do
  scope "(:locale)", locale: /#{Aypex.available_locales.join('|')}/, defaults: {locale: nil} do
    root to: "home#index"

    resources :addresses, except: [:index, :show]
    resources :orders, except: [:index, :new, :create, :destroy]
    resources :products, only: [:index, :show], path: "/products"

    get "/account_link", to: "store#account_link", as: :account_link
    get "/api_tokens", to: "store#api_tokens", as: :api_tokens
    get "/cart", to: "orders#edit", as: :cart
    patch "/cart", to: "orders#update", as: :update_cart
    patch "/cart/set_item_quantity/:id", to: "orders#set_item_quantity", as: :set_item_quantity
    patch "/cart/apply_coupon", to: "orders#apply_coupon", as: :apply_coupon
    patch "/cart/remove_coupon", to: "orders#remove_coupon", as: :remove_coupon
    post "/cart/add_item", to: "orders#add_to_cart", as: :add_to_cart
    put "/cart/empty", to: "orders#empty", as: :empty_cart
    get "/cart_link", to: "store#cart_link", as: :cart_link
    get "/currency/set", to: "currency#set", as: :set_currency
    post "/ensure_cart", to: "store#ensure_cart", as: :ensure_cart
    get "/forbidden", to: "errors#forbidden", as: :forbidden
    get "/locales", to: "locale#index", as: :locales
    get "/locale/set", to: "locale#set", as: :set_locale
    get "/pages/:slug", to: "cms_pages#show", as: :page
    get "/sections/:id", to: "cms_sections#show", as: :section
    get "/products/:id/related", to: "products#related", as: :related_products
    get "/product_carousel/:id", to: "categories#product_carousel", as: :product_carousel
    get "/category/*id", to: "categories#show", as: :nested_categories
    get "/unauthorized", to: "errors#unauthorized", as: :unauthorized
  end
end
