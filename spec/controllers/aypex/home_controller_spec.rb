require "spec_helper"

describe Aypex::HomeController, type: :controller do
  context "layout" do
    it "renders default layout" do
      get :index
      expect(response).to render_template(layout: "aypex/layouts/aypex_application")
    end

    it "calls fresh_when method" do
      expect(subject).to receive(:fresh_when)

      get :index
    end

    context "different layout specified in config" do
      before { Aypex::Storefront::Config.layout = "layouts/application" }

      it "renders specified layout" do
        get :index
        expect(response).to render_template(layout: "layouts/application")
      end
    end

    context "when http_cache_enabled is set to false" do
      before { Aypex::Storefront::Config.http_cache_enabled = false }
      after { Aypex::Storefront::Config.http_cache_enabled = true }

      it "does not call fresh_when method" do
        expect(subject).not_to receive(:fresh_when)

        get :index
      end
    end
  end
end
