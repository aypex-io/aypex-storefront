shared_context 'custom products' do
  before do
    categoryomy = FactoryBot.create(:categoryomy, name: 'Categories')
    root = categoryomy.root
    clothing_category = FactoryBot.create(:category, name: 'Clothing', parent: root, categoryomy: categoryomy)
    trending_category = FactoryBot.create(:category, name: 'Trending')
    bags_category = FactoryBot.create(:category, name: 'Bags', parent: root, categoryomy: categoryomy)
    mugs_category = FactoryBot.create(:category, name: 'Mugs', parent: root, categoryomy: categoryomy)

    categoryomy = FactoryBot.create(:categoryomy, name: 'Brands')
    root = categoryomy.root
    apache_category = FactoryBot.create(:category, name: 'Apache', parent: root, categoryomy: categoryomy)
    rails_category = FactoryBot.create(:category, name: 'Ruby on Rails', parent: root, categoryomy: categoryomy)
    ruby_category = FactoryBot.create(:category, name: 'Ruby', parent: root, categoryomy: categoryomy)
    store = Aypex::Store.default

    FactoryBot.create(:custom_product, name: 'Ruby on Rails Ringer T-Shirt', price: '159.99', categories: [rails_category, clothing_category], stores: [store])
    FactoryBot.create(:custom_product, name: 'Ruby on Rails Mug', price: '55.99', categories: [rails_category, mugs_category, trending_category], stores: [store])
    FactoryBot.create(:custom_product, name: 'Ruby on Rails Tote', price: '55.99', categories: [rails_category, bags_category, trending_category], stores: [store])
    FactoryBot.create(:custom_product, name: 'Ruby on Rails Bag', price: '102.99', categories: [rails_category, bags_category], stores: [store])
    FactoryBot.create(:custom_product, name: 'Ruby on Rails Baseball Jersey', price: '190.99', categories: [rails_category, clothing_category], stores: [store])
    FactoryBot.create(:custom_product, name: 'Ruby on Rails Stein', price: '156.99', categories: [rails_category, mugs_category], stores: [store])
    FactoryBot.create(:custom_product, name: 'Ruby on Rails Jr. Spaghetti', price: '190.99', categories: [rails_category, clothing_category], stores: [store])
    FactoryBot.create(:custom_product, name: 'Ruby Baseball Jersey', price: '250.99', categories: [ruby_category, clothing_category], stores: [store])
    FactoryBot.create(:custom_product, name: 'Apache Baseball Jersey', price: '250.99', categories: [apache_category, clothing_category], stores: [store])
  end
end
