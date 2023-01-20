require "spec_helper"

describe Aypex::Storefront::CategoriesHelper, type: :helper do
  # Regression test for #4382
  it "#category_preview" do
    category = create(:category)
    child_category = create(:category, parent: category, categoryomy: category.categoryomy)
    product_1 = create(:product, stores: Aypex::Store.all)
    product_2 = create(:product, stores: Aypex::Store.all)
    product_3 = create(:product, stores: Aypex::Store.all)
    category.products << product_1
    category.products << product_2
    child_category.products << product_3

    expect(category_preview(category.reload)).to eql([product_1, product_2, product_3])
  end
end
