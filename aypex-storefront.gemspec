require_relative "lib/aypex/storefront/version"

Gem::Specification.new do |spec|
  spec.platform = Gem::Platform::RUBY
  spec.name = "aypex-storefront"
  spec.version = Aypex::Storefront.version
  spec.authors = ["Matthew Kennedy"]
  spec.email = "info@aypex-io"
  spec.summary = "The default Storefront built with Rails and Turbo/Hotwire for Aypex eCommerce platform"
  spec.description = spec.summary
  spec.homepage = "https://aypex.io"
  spec.license = "BSD-3-Clause"

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = "https://github.com/aypex-io/aypex-storefront/tree/v#{spec.version}"
  spec.metadata["changelog_uri"] = "https://github.com/aypex-io/aypex-storefront/releases/tag/v#{spec.version}"

  spec.required_ruby_version = ">= 3.2"

  spec.files = `git ls-files`.split("\n").reject { |f| f.match(/^spec/) && !f.match(/^spec\/fixtures/) }
  spec.require_path = "lib"
  spec.requirements << "none"

  spec.add_dependency "aypex"
  spec.add_dependency "aypex-api"
  spec.add_dependency "canonical-rails"
  spec.add_dependency "inline_svg"
  spec.add_dependency "responders"
  spec.add_dependency "turbo-rails"
end
