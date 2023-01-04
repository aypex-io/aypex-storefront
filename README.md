# Aypex (Legacy) Frontend

This is the old Aypex Storefront extracted from Aypex < 4.3 which was upgraded to Turbo/Hotwire.

## Developed by

[![Vendo](https://assets-global.website-files.com/6230c485f2c32ea1b0daa438/623372f40a8c54ca9aea34e8_vendo%202.svg)](https://getvendo.com?utm_source=aypex_frontend_github)

> All-in-one platform for all your Marketplace and B2B eCommerce needs. [Start your 30-day free trial](https://e98esoirr8c.typeform.com/contactvendo?typeform-source=aypex_sdk_github)

## Installation

Add

```ruby
gem 'aypex_frontend'
```

to your `Gemfile`.

Run:

```bash
bundle install
bin/rails g jsbundling:esbuild:install
bin/rails g turbo:install
bin/rails g aypex:frontend:install
```

## Maintanence policy

This gem is in maintainence mode.

We only accept bug fixes, Aypex/Rails compatibility improvements & security patches.

For new project we recommend using [Storefront API](https://api.aypexcommerce.org/) to create your own unique storefront or use one of the pre-built starters: 

* [Next.js](https://dev-docs.aypexcommerce.org/storefronts/next.js-commerce)
* [Vue Storefront](https://dev-docs.aypexcommerce.org/storefronts/vue-storefront)

## Customization

[Developer documentation](https://dev-docs.aypexcommerce.org/customization/storefront)
