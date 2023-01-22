require "spec_helper"

describe "JSON-LD hashes", type: :feature, inaccessible: true do
  include_context "custom products"

  shared_examples "it contains products in JSON-LD hash" do |products|
    it "contains products in JSON-LD hash" do
      pairs = products.map do |product|
        [
          product,
          serialized_products.detect do |serialized_product|
            serialized_product["@id"] == "http://www.example.com/product_#{product.id}"
          end
        ]
      end

      pairs.each do |product, serialized_product|
        expect(serialized_product["@context"]).to eq "https://schema.org/"
        expect(serialized_product["@type"]).to eq "Product"
        expect(serialized_product["@id"]).to eq "http://www.example.com/product_#{product.id}"
        expect(serialized_product["url"]).to eq "http://www.example.com/products/#{product.slug}"
        expect(serialized_product["image"]).to eq ""
        expect(serialized_product["description"]).to eq product.description
        expect(serialized_product["sku"]).to eq product.sku

        offer = serialized_product["offers"]
        expect(offer["@type"]).to eq "Offer"
        expect(offer["price"]).to eq product.price_in("USD").amount.to_s
        expect(offer["priceCurrency"]).to eq "USD"
        expect(offer["url"]).to eq "http://www.example.com/products/#{product.slug}"
      end
    end
  end

  let(:serialized_products) do
    JSON.parse(
      page.find('script[type="application/ld+json"]', visible: false).text(:all)
    )
  end

  before do
    visit aypex.root_path
  end

  context "products page" do
    before { visit aypex.products_path }

    it_behaves_like "it contains products in JSON-LD hash",
      Aypex::Product.active("USD").all
  end

  context "product page" do
    before do
      product = Aypex::Product.find_by(name: "Ruby on Rails Baseball Jersey")

      visit aypex.product_path(product)
    end

    it_behaves_like "it contains products in JSON-LD hash",
      Aypex::Product.where(name: "Ruby on Rails Baseball Jersey")
  end

  context "category page" do
    before do
      category = Aypex::Category.find_by(name: "Bags")

      visit aypex.nested_categories_path(category)
    end

    it_behaves_like "it contains products in JSON-LD hash",
      Aypex::Product.where(name: ["Ruby on Rails Tote", "Ruby on Rails Bag"])
  end
end
