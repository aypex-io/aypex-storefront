module Aypex
  module Storefront
    module CartHelper
      include Aypex::BaseHelper

      def cart_form_radio_tag(option_type, option_value, index)
        option = {option_type_id: option_type[:id],
                  option_value_id: option_value[:id],
                  index: index}

        radio_button_tag "options[#{option_type[:id]}]",
          option_value[:id],
          selected_option(option_type, option_value, index),
          disabled: option_available?(option),
          class: "product-variant-option-value d-none",
          id: "ov_id_#{option_value[:id]}",
          data: {form_target: "radioButton",
                 action: "micro-form#submitViaClick form#resetRadiosWithHigherIndex",
                 radio_index_value: index}
      end

      def selected_option(option_type, option_value, index)
        if request.query_parameters[:options]
          opt_types_arr = request.query_parameters[:options].keys
          opt_values_arr = request.query_parameters[:options].values

          opt_types_arr.include?(option_type[:id].to_s) && opt_values_arr.include?(option_value[:id].to_s)
        else
          option_value[:is_default] && index == 0
        end
      end

      def option_available?(option)
        return true if option[:index] > 1 && request.query_parameters[:options].nil?

        return unless request.query_parameters[:options]

        opt_value_id = option[:option_value_id].to_s
        opt_values = request.query_parameters[:options].values

        if option[:index] == 0
          false
        else
          variants_with_opt = @variants.where(option_values: {id: opt_value_id}).map(&:id)
          variants_with_opt_req = Aypex::Variants::Find.new(variants: @variants, options: opt_values).execute

          if variants_with_opt.any? { |e| variants_with_opt_req.include?(e) }
            false
          else
            true
          end
        end
      end
    end
  end
end
