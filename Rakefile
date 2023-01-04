require 'rubygems'
require 'rake'
require 'rake/testtask'
require 'rspec/core/rake_task'
require 'aypex/testing_support/common_rake'

RSpec::Core::RakeTask.new

task default: :spec

desc "Generates a dummy app for testing"
task :test_app do
  ENV['LIB_NAME'] = 'aypex/storefront'
  Rake::Task['common:test_app'].execute( { install_storefront: true, install_admin: false } )
end
