require "spec_helper"

describe "Visiting the homepage", type: :feature, js: true do
  let!(:store) { Aypex::Store.default }

  let!(:categoryomy_a) { create(:categoryomy, name: "Bestsellers", store: store) }
  let!(:bestsellers) { create(:category, categoryomy: categoryomy_a, name: "Bestsellers") }

  let!(:product_a) { create(:product, name: "Superman T-Shirt", categories: [bestsellers], stores: [store]) }
  let!(:product_b) { create(:product, name: "Batman Socks", categories: [bestsellers], stores: [store]) }

  let!(:homepage) { create(:cms_homepage, store: store) }
  let!(:hp_section) { create(:cms_product_carousel_section, cms_page: homepage, linked_resource: bestsellers) }

  context "when category bestsellers exists and has products available in current store currency" do
    before do
      visit aypex.root_path
    end

    it "loads the carousel with the products displayed" do
      within "div[data-product-carousel-category-id='#{hp_section.linked_resource.id}']" do
        expect(page).to have_content("Superman T-Shirt")
        expect(page).to have_content("Batman Socks")
      end
    end

    it "loads carousel items in order of position" do
      within ".carouselItem:nth-child(1)" do
        expect(page).to have_content("Superman T-Shirt")
      end

      within ".carouselItem:nth-child(2)" do
        expect(page).to have_content("Batman Socks")
      end
    end
  end

  context "when products exist but not available in the current store currency" do
    before do
      store.update(default_currency: "GBP")
      visit aypex.root_path
    end

    it "the carousel is not loaded" do
      expect(page).not_to have_content("BESTSELLERS")
      expect(page).not_to have_content("Superman T-Shirt")
      expect(page).not_to have_content("Batman Socks")
    end
  end
end
