require_relative 'lib/aypex/frontend/version'

Gem::Specification.new do |s|
  s.platform    = Gem::Platform::RUBY
  s.name        = 'aypex_frontend'
  s.version     = Aypex::Frontend.version
  s.authors     = ['Sean Schofield', 'Spark Solutions']
  s.email       = 'hello@aypexcommerce.org'
  s.summary     = 'The default Storefront built with Rails and Turbo/Hotwire for Aypex eCommerce platform'
  s.description = s.summary
  s.homepage    = 'https://aypexcommerce.org'
  s.license     = 'BSD-3-Clause'

  s.metadata = {
    "bug_tracker_uri"   => "https://github.com/aypex/aypex/issues",
    "changelog_uri"     => "https://github.com/aypex/aypex/releases/tag/v#{s.version}",
    "documentation_uri" => "https://dev-docs.aypexcommerce.org/",
    "source_code_uri"   => "https://github.com/aypex/aypex/tree/v#{s.version}",
  }

  s.required_ruby_version = ">= 2.7"

  s.files        = `git ls-files`.split("\n").reject { |f| f.match(/^spec/) && !f.match(/^spec\/fixtures/) }
  s.require_path = 'lib'
  s.requirements << 'none'

  s.add_dependency 'aypex_api', ">= #{s.version}"
  s.add_dependency 'aypex_core', ">= #{s.version}"

  s.add_dependency 'babel-transpiler'
  s.add_dependency 'canonical-rails'
  s.add_dependency 'inline_svg'
  s.add_dependency 'responders'
  s.add_dependency 'turbo-rails'

  s.add_development_dependency 'capybara-accessible'
end
