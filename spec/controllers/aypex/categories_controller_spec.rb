require 'spec_helper'

describe Aypex::CategoriesController, type: :controller do
  it 'provides the current user to the searcher class' do
    category = create(:category, permalink: 'test')
    user = mock_model(Aypex.user_class, last_incomplete_aypex_order: nil, aypex_api_key: 'fake')
    allow(controller).to receive_messages aypex_current_user: user
    expect_any_instance_of(Aypex::Config.searcher_class).to receive(:current_user=).with(user)
    get :show, params: { id: category.permalink }
    expect(response.status).to eq(200)
  end
end
