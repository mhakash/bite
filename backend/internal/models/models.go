// Package models defines the JSON shapes shared with the frontend. Field
// names match what the React app already expects so the client needed
// minimal changes when it switched from localStorage to this API.
package models

import (
	_ "embed"
	"encoding/json"
)

//go:embed seed_foods.json
var seedFoodsJSON []byte

// SeedFoods returns a fresh copy of the starter food library given to every
// newly created user, mirroring the original localStorage-only app's SEED_FOODS.
func SeedFoods() []Food {
	var foods []Food
	if err := json.Unmarshal(seedFoodsJSON, &foods); err != nil {
		panic("models: invalid seed_foods.json: " + err.Error())
	}
	return foods
}

type Portion struct {
	ID    string  `json:"id"`
	Label string  `json:"label"`
	Grams float64 `json:"grams"`
}

type Food struct {
	ID               string             `json:"id"`
	Name             string             `json:"name"`
	Brand            string             `json:"brand"`
	Color            string             `json:"color"`
	Portions         []Portion          `json:"portions"`
	DefaultPortionID string             `json:"defaultPortionId"`
	Nutrients        map[string]float64 `json:"nutrients"`
}

type Meal struct {
	ID        string `json:"id"`
	Label     string `json:"label"`
	Icon      string `json:"icon"`
	SortOrder int    `json:"sortOrder"`
}

type LogEntry struct {
	ID          string   `json:"id"`
	Date        string   `json:"date"`
	Meal        string   `json:"meal"`
	FoodID      string   `json:"foodId"`
	PortionID   string   `json:"portionId,omitempty"`
	Quantity    float64  `json:"quantity"`
	CustomGrams *float64 `json:"customGrams,omitempty"`
	CreatedAt   int64    `json:"createdAt"`
}

type Settings struct {
	CalorieGoal float64 `json:"calorieGoal"`
	ProteinGoal float64 `json:"proteinGoal"`
	CarbsGoal   float64 `json:"carbsGoal"`
	FatGoal     float64 `json:"fatGoal"`
	WaterGoalMl float64 `json:"waterGoalMl"`
	Name        string  `json:"name"`
}

type Bootstrap struct {
	Foods    []Food             `json:"foods"`
	Meals    []Meal             `json:"meals"`
	Logs     []LogEntry         `json:"logs"`
	Water    map[string]float64 `json:"water"`
	Settings Settings           `json:"settings"`
}

var DefaultSettings = Settings{
	CalorieGoal: 2000,
	ProteinGoal: 120,
	CarbsGoal:   230,
	FatGoal:     65,
	WaterGoalMl: 2500,
}

var DefaultMeals = []Meal{
	{ID: "breakfast", Label: "Breakfast", Icon: "sunrise", SortOrder: 0},
	{ID: "lunch", Label: "Lunch", Icon: "sun", SortOrder: 1},
	{ID: "dinner", Label: "Dinner", Icon: "moon", SortOrder: 2},
	{ID: "snack", Label: "Snacks", Icon: "sparkle", SortOrder: 3},
}
