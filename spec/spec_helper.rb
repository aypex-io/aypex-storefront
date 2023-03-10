# Set environment to test
ENV["RAILS_ENV"] = "test"

# Load the dummy test application.
begin
  require File.expand_path("../../tmp/dummy/config/environment", __FILE__)
rescue LoadError
  puts "Could not load dummy application. Please ensure you have run `bundle exec rake test_app`"
end

require "rspec/rails"
require "ffaker"

require "database_cleaner"

require "aypex/testing_support/i18n" if ENV["CHECK_TRANSLATIONS"]
require "aypex/testing_support/authorization_helpers"
require "aypex/testing_support/capybara_ext"
require "aypex/testing_support/factories"
require "aypex/testing_support/preferences"
require "aypex/testing_support/controller_requests"
require "aypex/testing_support/flash"
require "aypex/testing_support/url_helpers"
require "aypex/testing_support/order_walkthrough"
require "aypex/testing_support/caching"
require "aypex/testing_support/capybara_config"
require "aypex/testing_support/image_helpers"
require "aypex/testing_support/locale_helpers"
require "webdrivers"

# Requires supporting files with custom matchers and macros, etc,
# in ./support/ and its sub-directories.
Dir["#{File.dirname(__FILE__)}/support/**/*.rb"].each { |f| require f }

def wait_for_turbo
  expect(page).not_to have_css ".turbo-progress-bar"
end

RSpec.configure do |config|
  config.color = true
  config.default_formatter = "doc"
  config.fail_fast = ENV["FAIL_FAST"] || false
  config.fixture_path = File.join(__dir__, "fixtures")
  config.infer_spec_type_from_file_location!
  config.mock_with :rspec
  config.raise_errors_for_deprecations!

  # If you're not using ActiveRecord, or you'd prefer not to run each of your
  # examples within a transaction, comment the following line or assign false
  # instead of true.
  config.use_transactional_fixtures = false

  if ENV["WEBDRIVER"] == "accessible"
    config.around(:each, inaccessible: true) do |example|
      Capybara::Accessible.skip_audit { example.run }
    end
  end

  # Ensure DB is clean, so that transaction isolated specs see
  # pristine state.
  config.before(:suite) do
    DatabaseCleaner.strategy = :truncation
    DatabaseCleaner.clean
  end

  config.before do
    Rails.cache.clear
    WebMock.disable!
    DatabaseCleaner.strategy = if RSpec.current_example.metadata[:js]
      :truncation
    else
      :transaction
    end
    # TODO: Find out why open_transactions ever gets below 0
    # See issue #3428
    ApplicationRecord.connection.increment_open_transactions if ApplicationRecord.connection.open_transactions < 0

    DatabaseCleaner.start
    reset_aypex_preferences

    country = create(:country, name: "United States of America", iso_name: "UNITED STATES", iso: "US", states_required: true)
    Aypex::Config[:default_country_id] = country.id

    create(:store, default: true, default_currency: "USD", default_country: country)
    create(:category, permalink: "trending")
    create(:category, permalink: "bestsellers")
  end

  config.after(:each, type: :feature) do |example|
    missing_translations = page.body.scan(/translation missing: #{I18n.locale}\.(.*?)[\s<"&]/)
    if missing_translations.any?
      puts "Found missing translations: #{missing_translations.inspect}"
      puts "In spec: #{example.location}"
    end
  end

  config.append_after do
    DatabaseCleaner.clean
  end

  config.include FactoryBot::Syntax::Methods

  config.include Aypex::TestingSupport::Preferences
  config.include Aypex::TestingSupport::UrlHelpers
  config.include Aypex::TestingSupport::ControllerRequests, type: :controller
  config.include Aypex::TestingSupport::Flash
  config.include Aypex::TestingSupport::ImageHelpers
  config.include Aypex::TestingSupport::LocaleHelpers

  config.order = :random
  Kernel.srand config.seed

  config.display_try_failure_messages = true

  config.filter_run_including focus: true unless ENV["CI"]
  config.run_all_when_everything_filtered = true
end
