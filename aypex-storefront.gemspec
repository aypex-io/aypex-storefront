require_relative "lib/aypex/storefront/version"

Gem::Specification.new do |spec|
  spec.platform = Gem::Platform::RUBY
  spec.name = "aypex-storefront"
  spec.version = Aypex::Storefront.version
  spec.authors = ["Matthew Kennedy"]
  spec.email = "hello@aypexcommerce.org"
  spec.summary = "The default Storefront built with Rails and Turbo/Hotwire for Aypex eCommerce platform"
  spec.description = spec.summary
  spec.homepage = "https://aypexcommerce.org"
  spec.license = "BSD-3-Clause"

  spec.metadata = {
    "bug_tracker_uri" => "https://github.com/aypex/aypex/issues",
    "changelog_uri" => "https://github.com/aypex/aypex/releases/tag/v#{spec.version}",
    "documentation_uri" => "https://dev-docspec.aypexcommerce.org/",
    "source_code_uri" => "https://github.com/aypex/aypex/tree/v#{spec.version}"
  }

  spec.required_ruby_version = ">= 3.2"

  spec.files = `git ls-files`.split("\n").reject { |f| f.match(/^spec/) && !f.match(/^spec\/fixtures/) }
  spec.require_path = "lib"
  spec.requirements << "none"

  spec.add_dependency "aypex"
  spec.add_dependency "aypex-api"

  spec.add_dependency "babel-transpiler"
  spec.add_dependency "canonical-rails"
  spec.add_dependency "inline_svg"
  spec.add_dependency "responders"
  spec.add_dependency "turbo-rails"
end
