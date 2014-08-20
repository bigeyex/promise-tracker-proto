class AddGoalToCampaigns < ActiveRecord::Migration
  def change
    add_column :campaigns, :meta, :integer
  end
end
