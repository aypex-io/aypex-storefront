require "spec_helper"

describe "API Tokens Spec", type: :request do
  let(:json_response) { JSON.parse(response.body) }

  shared_examples "returns valid response" do
    it "with 200 HTTP status" do
      expect(response.status).to eq(200)
    end

    it "with all keys" do
      expect(json_response).to have_key("order_token")
      expect(json_response).to have_key("oauth_token")
    end
  end

  context "guest user" do
    context "with already created order" do
      let(:order) { create(:order, user: nil, email: "dummy@example.com") }

      before do
        allow_any_instance_of(Aypex::StoreController).to receive_messages(simple_current_order: order)
        get "/api_tokens"
      end

      it "returns order token" do
        expect(response.status).to eq(200)
        expect(json_response["order_token"]).to eq(order.token)
        expect(json_response["oauth_token"]).to be_blank
      end

      it_behaves_like "returns valid response"
    end

    context "without order" do
      before do
        get "/api_tokens"
      end

      it "returns blank tokens" do
        expect(response.status).to eq(200)
        expect(json_response["order_token"]).to be_blank
        expect(json_response["oauth_token"]).to be_blank
      end

      it_behaves_like "returns valid response"
    end
  end

  context "signed in user" do
    let(:user) { create(:user) }

    before do
      allow_any_instance_of(Aypex::StoreController).to receive_messages(try_aypex_current_user: user)
    end

    context "with already created order" do
      let(:order) { create(:order, user: user) }

      before do
        allow_any_instance_of(Aypex::StoreController).to receive_messages(simple_current_order: order)
        get "/api_tokens"
      end

      it "returns order token and oauth token" do
        expect(response.status).to eq(200)
        expect(json_response["order_token"]).to eq(order.token)
        expect(json_response["oauth_token"]).not_to be_blank
      end

      it_behaves_like "returns valid response"
    end

    context "without order" do
      before do
        get "/api_tokens"
      end

      it "returns only oauth token" do
        expect(response.status).to eq(200)
        expect(json_response["order_token"]).to be_blank
        expect(json_response["oauth_token"]).not_to be_blank
      end

      it_behaves_like "returns valid response"
    end
  end
end
