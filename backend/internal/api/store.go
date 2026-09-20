package api

import (
	"database/sql"
	"encoding/json"
	"strings"
	"time"

	"bite/internal/models"
)

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store { return &Store{db: db} }

// --- bootstrap / settings ---

func (s *Store) Bootstrap(userID int64) (models.Bootstrap, error) {
	foods, err := s.ListFoods(userID)
	if err != nil {
		return models.Bootstrap{}, err
	}
	meals, err := s.ListMeals(userID)
	if err != nil {
		return models.Bootstrap{}, err
	}
	settings, err := s.GetSettings(userID)
	if err != nil {
		return models.Bootstrap{}, err
	}
	return models.Bootstrap{Foods: foods, Meals: meals, Settings: settings}, nil
}

func (s *Store) GetSettings(userID int64) (models.Settings, error) {
	var st models.Settings
	err := s.db.QueryRow(
		`SELECT calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal_ml, name FROM settings WHERE user_id = ?`,
		userID,
	).Scan(&st.CalorieGoal, &st.ProteinGoal, &st.CarbsGoal, &st.FatGoal, &st.WaterGoalMl, &st.Name)
	if err != nil {
		return models.Settings{}, err
	}
	return st, nil
}

func (s *Store) UpdateSettings(userID int64, st models.Settings) error {
	_, err := s.db.Exec(
		`UPDATE settings SET calorie_goal=?, protein_goal=?, carbs_goal=?, fat_goal=?, water_goal_ml=?, name=? WHERE user_id=?`,
		st.CalorieGoal, st.ProteinGoal, st.CarbsGoal, st.FatGoal, st.WaterGoalMl, st.Name, userID,
	)
	return err
}

// --- foods ---

func (s *Store) ListFoods(userID int64) ([]models.Food, error) {
	rows, err := s.db.Query(
		`SELECT id, name, brand, color, portions, default_portion_id, nutrients FROM foods WHERE user_id = ? ORDER BY created_at`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	foods := []models.Food{}
	for rows.Next() {
		var f models.Food
		var portionsJSON, nutrientsJSON string
		if err := rows.Scan(&f.ID, &f.Name, &f.Brand, &f.Color, &portionsJSON, &f.DefaultPortionID, &nutrientsJSON); err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(portionsJSON), &f.Portions); err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(nutrientsJSON), &f.Nutrients); err != nil {
			return nil, err
		}
		foods = append(foods, f)
	}
	return foods, rows.Err()
}

func (s *Store) InsertFood(userID int64, f models.Food) error {
	portionsJSON, err := json.Marshal(f.Portions)
	if err != nil {
		return err
	}
	nutrientsJSON, err := json.Marshal(f.Nutrients)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(
		`INSERT INTO foods (id, user_id, name, brand, color, portions, default_portion_id, nutrients, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		f.ID, userID, f.Name, f.Brand, f.Color, string(portionsJSON), f.DefaultPortionID, string(nutrientsJSON), time.Now().UnixMilli(),
	)
	return err
}

func (s *Store) FoodNamesLower(userID int64) (map[string]bool, error) {
	rows, err := s.db.Query(`SELECT name FROM foods WHERE user_id = ?`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	names := map[string]bool{}
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		names[strings.ToLower(name)] = true
	}
	return names, rows.Err()
}

func (s *Store) GetFood(userID int64, id string) (models.Food, error) {
	var f models.Food
	var portionsJSON, nutrientsJSON string
	err := s.db.QueryRow(
		`SELECT id, name, brand, color, portions, default_portion_id, nutrients FROM foods WHERE user_id = ? AND id = ?`,
		userID, id,
	).Scan(&f.ID, &f.Name, &f.Brand, &f.Color, &portionsJSON, &f.DefaultPortionID, &nutrientsJSON)
	if err != nil {
		return models.Food{}, err
	}
	json.Unmarshal([]byte(portionsJSON), &f.Portions)
	json.Unmarshal([]byte(nutrientsJSON), &f.Nutrients)
	return f, nil
}

func (s *Store) UpdateFood(userID int64, f models.Food) error {
	portionsJSON, err := json.Marshal(f.Portions)
	if err != nil {
		return err
	}
	nutrientsJSON, err := json.Marshal(f.Nutrients)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(
		`UPDATE foods SET name=?, brand=?, color=?, portions=?, default_portion_id=?, nutrients=? WHERE user_id=? AND id=?`,
		f.Name, f.Brand, f.Color, string(portionsJSON), f.DefaultPortionID, string(nutrientsJSON), userID, f.ID,
	)
	return err
}

func (s *Store) DeleteFood(userID int64, id string) error {
	_, err := s.db.Exec(`DELETE FROM foods WHERE user_id = ? AND id = ?`, userID, id)
	return err
}

// --- meals ---

func (s *Store) ListMeals(userID int64) ([]models.Meal, error) {
	rows, err := s.db.Query(`SELECT id, label, icon, sort_order FROM meals WHERE user_id = ? ORDER BY sort_order`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	meals := []models.Meal{}
	for rows.Next() {
		var m models.Meal
		if err := rows.Scan(&m.ID, &m.Label, &m.Icon, &m.SortOrder); err != nil {
			return nil, err
		}
		meals = append(meals, m)
	}
	return meals, rows.Err()
}

func (s *Store) InsertMeal(userID int64, m models.Meal) error {
	_, err := s.db.Exec(
		`INSERT INTO meals (id, user_id, label, icon, sort_order) VALUES (?, ?, ?, ?, ?)`,
		m.ID, userID, m.Label, m.Icon, m.SortOrder,
	)
	return err
}

func (s *Store) NextMealSortOrder(userID int64) (int, error) {
	var max sql.NullInt64
	err := s.db.QueryRow(`SELECT MAX(sort_order) FROM meals WHERE user_id = ?`, userID).Scan(&max)
	if err != nil {
		return 0, err
	}
	if !max.Valid {
		return 0, nil
	}
	return int(max.Int64) + 1, nil
}

func (s *Store) UpdateMeal(userID int64, m models.Meal) error {
	_, err := s.db.Exec(
		`UPDATE meals SET label=?, icon=?, sort_order=? WHERE user_id=? AND id=?`,
		m.Label, m.Icon, m.SortOrder, userID, m.ID,
	)
	return err
}

func (s *Store) DeleteMeal(userID int64, id string) error {
	_, err := s.db.Exec(`DELETE FROM meals WHERE user_id = ? AND id = ?`, userID, id)
	return err
}

// --- log entries ---

func (s *Store) InsertLogEntry(userID int64, e models.LogEntry) error {
	var customGrams any
	if e.CustomGrams != nil {
		customGrams = *e.CustomGrams
	}
	_, err := s.db.Exec(
		`INSERT INTO log_entries (id, user_id, date, meal, food_id, portion_id, quantity, custom_grams, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		e.ID, userID, e.Date, e.Meal, e.FoodID, e.PortionID, e.Quantity, customGrams, e.CreatedAt,
	)
	return err
}

func (s *Store) GetLogEntry(userID int64, id string) (models.LogEntry, error) {
	var e models.LogEntry
	var customGrams sql.NullFloat64
	err := s.db.QueryRow(
		`SELECT id, date, meal, food_id, portion_id, quantity, custom_grams, created_at FROM log_entries WHERE user_id = ? AND id = ?`,
		userID, id,
	).Scan(&e.ID, &e.Date, &e.Meal, &e.FoodID, &e.PortionID, &e.Quantity, &customGrams, &e.CreatedAt)
	if err != nil {
		return models.LogEntry{}, err
	}
	if customGrams.Valid {
		e.CustomGrams = &customGrams.Float64
	}
	return e, nil
}

func (s *Store) UpdateLogEntry(userID int64, e models.LogEntry) error {
	var customGrams any
	if e.CustomGrams != nil {
		customGrams = *e.CustomGrams
	}
	_, err := s.db.Exec(
		`UPDATE log_entries SET date=?, meal=?, food_id=?, portion_id=?, quantity=?, custom_grams=? WHERE user_id=? AND id=?`,
		e.Date, e.Meal, e.FoodID, e.PortionID, e.Quantity, customGrams, userID, e.ID,
	)
	return err
}

func (s *Store) DeleteLogEntry(userID int64, id string) error {
	_, err := s.db.Exec(`DELETE FROM log_entries WHERE user_id = ? AND id = ?`, userID, id)
	return err
}

func (s *Store) LogsForDate(userID int64, date string) ([]models.LogEntry, error) {
	rows, err := s.db.Query(
		`SELECT id, date, meal, food_id, portion_id, quantity, custom_grams, created_at FROM log_entries WHERE user_id = ? AND date = ?`,
		userID, date,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	entries := []models.LogEntry{}
	for rows.Next() {
		var e models.LogEntry
		var customGrams sql.NullFloat64
		if err := rows.Scan(&e.ID, &e.Date, &e.Meal, &e.FoodID, &e.PortionID, &e.Quantity, &customGrams, &e.CreatedAt); err != nil {
			return nil, err
		}
		if customGrams.Valid {
			e.CustomGrams = &customGrams.Float64
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

// LogsForDateRange returns log entries between start and end (inclusive),
// e.g. for the weekly trend chart. Callers should keep the range small —
// this loads every matching row into memory.
func (s *Store) LogsForDateRange(userID int64, start, end string) ([]models.LogEntry, error) {
	rows, err := s.db.Query(
		`SELECT id, date, meal, food_id, portion_id, quantity, custom_grams, created_at FROM log_entries WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY created_at`,
		userID, start, end,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	entries := []models.LogEntry{}
	for rows.Next() {
		var e models.LogEntry
		var customGrams sql.NullFloat64
		if err := rows.Scan(&e.ID, &e.Date, &e.Meal, &e.FoodID, &e.PortionID, &e.Quantity, &customGrams, &e.CreatedAt); err != nil {
			return nil, err
		}
		if customGrams.Valid {
			e.CustomGrams = &customGrams.Float64
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

// LoggedDates returns every distinct date the user has a log entry on, used
// to compute the logging streak without loading the entries themselves.
func (s *Store) LoggedDates(userID int64) ([]string, error) {
	rows, err := s.db.Query(`SELECT DISTINCT date FROM log_entries WHERE user_id = ?`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	dates := []string{}
	for rows.Next() {
		var date string
		if err := rows.Scan(&date); err != nil {
			return nil, err
		}
		dates = append(dates, date)
	}
	return dates, rows.Err()
}

// --- water ---

func (s *Store) WaterForDate(userID int64, date string) (float64, error) {
	var ml float64
	err := s.db.QueryRow(`SELECT ml FROM water_logs WHERE user_id = ? AND date = ?`, userID, date).Scan(&ml)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	return ml, nil
}

func (s *Store) SetWater(userID int64, date string, ml float64) error {
	_, err := s.db.Exec(
		`INSERT INTO water_logs (user_id, date, ml) VALUES (?, ?, ?) ON CONFLICT(user_id, date) DO UPDATE SET ml = excluded.ml`,
		userID, date, ml,
	)
	return err
}

// --- new user bootstrap ---

func (s *Store) CreateUser(username, passwordHash string) (int64, error) {
	res, err := s.db.Exec(`INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)`, username, passwordHash, time.Now().Unix())
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// SeedNewUser gives a freshly created user the same starting library,
// meals, and settings the original localStorage-only app shipped with.
func (s *Store) SeedNewUser(userID int64) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, m := range models.DefaultMeals {
		if _, err := tx.Exec(`INSERT INTO meals (id, user_id, label, icon, sort_order) VALUES (?, ?, ?, ?, ?)`,
			m.ID, userID, m.Label, m.Icon, m.SortOrder); err != nil {
			return err
		}
	}
	for _, f := range models.SeedFoods() {
		portionsJSON, err := json.Marshal(f.Portions)
		if err != nil {
			return err
		}
		nutrientsJSON, err := json.Marshal(f.Nutrients)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(
			`INSERT INTO foods (id, user_id, name, brand, color, portions, default_portion_id, nutrients, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			f.ID, userID, f.Name, f.Brand, f.Color, string(portionsJSON), f.DefaultPortionID, string(nutrientsJSON), time.Now().UnixMilli(),
		); err != nil {
			return err
		}
	}
	st := models.DefaultSettings
	if _, err := tx.Exec(
		`INSERT INTO settings (user_id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal_ml, name) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		userID, st.CalorieGoal, st.ProteinGoal, st.CarbsGoal, st.FatGoal, st.WaterGoalMl, st.Name,
	); err != nil {
		return err
	}

	return tx.Commit()
}
