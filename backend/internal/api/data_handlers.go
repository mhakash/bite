package api

import (
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"bite/internal/models"
)

func (a *API) handleBootstrap(w http.ResponseWriter, r *http.Request) {
	userID, _ := userIDFromContext(r.Context())
	data, err := a.store.Bootstrap(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load data")
		return
	}
	writeJSON(w, http.StatusOK, data)
}

// --- foods ---

func (a *API) handleCreateFood(w http.ResponseWriter, r *http.Request) {
	userID, _ := userIDFromContext(r.Context())
	var f models.Food
	if err := decodeJSON(r, &f); err != nil {
		writeError(w, http.StatusBadRequest, "invalid food")
		return
	}
	f.ID = "f-" + uuid.NewString()
	if err := a.store.InsertFood(userID, f); err != nil {
		writeError(w, http.StatusInternalServerError, "could not save food")
		return
	}
	writeJSON(w, http.StatusCreated, f)
}

type bulkFoodsRequest struct {
	Foods []models.Food `json:"foods"`
}

type bulkFoodsResponse struct {
	Added   int           `json:"added"`
	Skipped int           `json:"skipped"`
	Foods   []models.Food `json:"foods"`
}

func (a *API) handleBulkCreateFoods(w http.ResponseWriter, r *http.Request) {
	userID, _ := userIDFromContext(r.Context())
	var req bulkFoodsRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	existingNames, err := a.store.FoodNamesLower(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not check existing foods")
		return
	}

	created := []models.Food{}
	skipped := 0
	for _, f := range req.Foods {
		key := strings.ToLower(f.Name)
		if existingNames[key] {
			skipped++
			continue
		}
		existingNames[key] = true
		f.ID = "f-" + uuid.NewString()
		if err := a.store.InsertFood(userID, f); err != nil {
			writeError(w, http.StatusInternalServerError, "could not save food")
			return
		}
		created = append(created, f)
	}

	writeJSON(w, http.StatusOK, bulkFoodsResponse{Added: len(created), Skipped: skipped, Foods: created})
}

func (a *API) handleUpdateFood(w http.ResponseWriter, r *http.Request) {
	userID, _ := userIDFromContext(r.Context())
	id := r.PathValue("id")

	existing, err := a.store.GetFood(userID, id)
	if err != nil {
		writeError(w, http.StatusNotFound, "food not found")
		return
	}
	if err := decodeJSON(r, &existing); err != nil {
		writeError(w, http.StatusBadRequest, "invalid food")
		return
	}
	existing.ID = id
	if err := a.store.UpdateFood(userID, existing); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update food")
		return
	}
	writeJSON(w, http.StatusOK, existing)
}

func (a *API) handleDeleteFood(w http.ResponseWriter, r *http.Request) {
	userID, _ := userIDFromContext(r.Context())
	id := r.PathValue("id")
	if err := a.store.DeleteFood(userID, id); err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete food")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- meals ---

func (a *API) handleListMeals(w http.ResponseWriter, r *http.Request) {
	userID, _ := userIDFromContext(r.Context())
	meals, err := a.store.ListMeals(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load meals")
		return
	}
	writeJSON(w, http.StatusOK, meals)
}

type createMealRequest struct {
	Label string `json:"label"`
	Icon  string `json:"icon"`
}

func (a *API) handleCreateMeal(w http.ResponseWriter, r *http.Request) {
	userID, _ := userIDFromContext(r.Context())
	var req createMealRequest
	if err := decodeJSON(r, &req); err != nil || strings.TrimSpace(req.Label) == "" {
		writeError(w, http.StatusBadRequest, "invalid meal")
		return
	}
	if req.Icon == "" {
		req.Icon = "sparkle"
	}
	sortOrder, err := a.store.NextMealSortOrder(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create meal")
		return
	}
	meal := models.Meal{ID: "m-" + uuid.NewString(), Label: strings.TrimSpace(req.Label), Icon: req.Icon, SortOrder: sortOrder}
	if err := a.store.InsertMeal(userID, meal); err != nil {
		writeError(w, http.StatusInternalServerError, "could not create meal")
		return
	}
	writeJSON(w, http.StatusCreated, meal)
}

func (a *API) handleUpdateMeal(w http.ResponseWriter, r *http.Request) {
	userID, _ := userIDFromContext(r.Context())
	id := r.PathValue("id")

	meals, err := a.store.ListMeals(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load meal")
		return
	}
	var existing *models.Meal
	for i := range meals {
		if meals[i].ID == id {
			existing = &meals[i]
			break
		}
	}
	if existing == nil {
		writeError(w, http.StatusNotFound, "meal not found")
		return
	}
	if err := decodeJSON(r, existing); err != nil {
		writeError(w, http.StatusBadRequest, "invalid meal")
		return
	}
	existing.ID = id
	if err := a.store.UpdateMeal(userID, *existing); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update meal")
		return
	}
	writeJSON(w, http.StatusOK, existing)
}

func (a *API) handleDeleteMeal(w http.ResponseWriter, r *http.Request) {
	userID, _ := userIDFromContext(r.Context())
	id := r.PathValue("id")
	if err := a.store.DeleteMeal(userID, id); err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete meal")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- log entries ---

// handleListLogs returns log entries for a single day (?date=YYYY-MM-DD) or
// a date range (?start=YYYY-MM-DD&end=YYYY-MM-DD), e.g. for the weekly trend
// chart. It never returns a user's whole history at once.
func (a *API) handleListLogs(w http.ResponseWriter, r *http.Request) {
	userID, _ := userIDFromContext(r.Context())
	date := r.URL.Query().Get("date")
	start := r.URL.Query().Get("start")
	end := r.URL.Query().Get("end")

	var (
		entries []models.LogEntry
		err     error
	)
	switch {
	case date != "":
		entries, err = a.store.LogsForDate(userID, date)
	case start != "" && end != "":
		entries, err = a.store.LogsForDateRange(userID, start, end)
	default:
		writeError(w, http.StatusBadRequest, "date or start/end query parameter required")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load logs")
		return
	}
	writeJSON(w, http.StatusOK, entries)
}

func (a *API) handleLoggedDates(w http.ResponseWriter, r *http.Request) {
	userID, _ := userIDFromContext(r.Context())
	dates, err := a.store.LoggedDates(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load logged dates")
		return
	}
	writeJSON(w, http.StatusOK, dates)
}

func (a *API) handleCreateLog(w http.ResponseWriter, r *http.Request) {
	userID, _ := userIDFromContext(r.Context())
	var e models.LogEntry
	if err := decodeJSON(r, &e); err != nil {
		writeError(w, http.StatusBadRequest, "invalid log entry")
		return
	}
	e.ID = "e-" + uuid.NewString()
	e.CreatedAt = time.Now().UnixMilli()
	if e.Quantity == 0 && e.CustomGrams == nil {
		e.Quantity = 1
	}
	if err := a.store.InsertLogEntry(userID, e); err != nil {
		writeError(w, http.StatusInternalServerError, "could not save log entry")
		return
	}
	writeJSON(w, http.StatusCreated, e)
}

func (a *API) handleUpdateLog(w http.ResponseWriter, r *http.Request) {
	userID, _ := userIDFromContext(r.Context())
	id := r.PathValue("id")

	existing, err := a.store.GetLogEntry(userID, id)
	if err != nil {
		writeError(w, http.StatusNotFound, "log entry not found")
		return
	}
	if err := decodeJSON(r, &existing); err != nil {
		writeError(w, http.StatusBadRequest, "invalid log entry")
		return
	}
	existing.ID = id
	if err := a.store.UpdateLogEntry(userID, existing); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update log entry")
		return
	}
	writeJSON(w, http.StatusOK, existing)
}

func (a *API) handleDeleteLog(w http.ResponseWriter, r *http.Request) {
	userID, _ := userIDFromContext(r.Context())
	id := r.PathValue("id")
	if err := a.store.DeleteLogEntry(userID, id); err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete log entry")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type copyDayRequest struct {
	FromDate string `json:"fromDate"`
	ToDate   string `json:"toDate"`
}

func (a *API) handleCopyDay(w http.ResponseWriter, r *http.Request) {
	userID, _ := userIDFromContext(r.Context())
	var req copyDayRequest
	if err := decodeJSON(r, &req); err != nil || req.FromDate == "" || req.ToDate == "" {
		writeError(w, http.StatusBadRequest, "invalid request")
		return
	}

	entries, err := a.store.LogsForDate(userID, req.FromDate)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load source day")
		return
	}

	copies := make([]models.LogEntry, 0, len(entries))
	for _, e := range entries {
		e.ID = "e-" + uuid.NewString()
		e.Date = req.ToDate
		e.CreatedAt = time.Now().UnixMilli()
		if err := a.store.InsertLogEntry(userID, e); err != nil {
			writeError(w, http.StatusInternalServerError, "could not copy day")
			return
		}
		copies = append(copies, e)
	}

	writeJSON(w, http.StatusOK, copies)
}

// --- water ---

func (a *API) handleGetWater(w http.ResponseWriter, r *http.Request) {
	userID, _ := userIDFromContext(r.Context())
	date := r.PathValue("date")
	ml, err := a.store.WaterForDate(userID, date)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load water")
		return
	}
	writeJSON(w, http.StatusOK, setWaterRequest{Ml: ml})
}

type setWaterRequest struct {
	Ml float64 `json:"ml"`
}

func (a *API) handleSetWater(w http.ResponseWriter, r *http.Request) {
	userID, _ := userIDFromContext(r.Context())
	date := r.PathValue("date")
	var req setWaterRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request")
		return
	}
	if req.Ml < 0 {
		req.Ml = 0
	}
	if err := a.store.SetWater(userID, date, req.Ml); err != nil {
		writeError(w, http.StatusInternalServerError, "could not save water")
		return
	}
	writeJSON(w, http.StatusOK, req)
}

// --- settings ---

func (a *API) handleUpdateSettings(w http.ResponseWriter, r *http.Request) {
	userID, _ := userIDFromContext(r.Context())
	existing, err := a.store.GetSettings(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load settings")
		return
	}
	if err := decodeJSON(r, &existing); err != nil {
		writeError(w, http.StatusBadRequest, "invalid settings")
		return
	}
	if err := a.store.UpdateSettings(userID, existing); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update settings")
		return
	}
	writeJSON(w, http.StatusOK, existing)
}

// --- day import ---

type dayImportRequest struct {
	Date    string           `json:"date"`
	WaterMl float64          `json:"waterMl"`
	Entries []dayImportEntry `json:"entries"`
	Foods   []models.Food    `json:"foods"`
}

type dayImportEntry struct {
	FoodID      string   `json:"foodId"`
	PortionID   string   `json:"portionId,omitempty"`
	Quantity    float64  `json:"quantity"`
	CustomGrams *float64 `json:"customGrams,omitempty"`
	Meal        string   `json:"meal"`
}

type dayImportResponse struct {
	AddedFoods   int `json:"addedFoods"`
	AddedEntries int `json:"addedEntries"`
}

// handleImportDay merges a day-export snapshot: any referenced foods that
// don't already exist (matched by name) are created, then log entries are
// added under the given date, remapped to the resolved food IDs.
func (a *API) handleImportDay(w http.ResponseWriter, r *http.Request) {
	userID, _ := userIDFromContext(r.Context())
	var req dayImportRequest
	if err := decodeJSON(r, &req); err != nil || req.Date == "" {
		writeError(w, http.StatusBadRequest, "invalid day import")
		return
	}

	existingFoods, err := a.store.ListFoods(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load foods")
		return
	}
	nameToID := map[string]string{}
	for _, f := range existingFoods {
		nameToID[strings.ToLower(f.Name)] = f.ID
	}

	idMap := map[string]string{}
	addedFoods := 0
	for _, f := range req.Foods {
		key := strings.ToLower(f.Name)
		if id, ok := nameToID[key]; ok {
			idMap[f.ID] = id
			continue
		}
		newID := "f-" + uuid.NewString()
		idMap[f.ID] = newID
		nameToID[key] = newID
		f.ID = newID
		if err := a.store.InsertFood(userID, f); err != nil {
			writeError(w, http.StatusInternalServerError, "could not import foods")
			return
		}
		addedFoods++
	}

	addedEntries := 0
	for _, e := range req.Entries {
		foodID := e.FoodID
		if mapped, ok := idMap[foodID]; ok {
			foodID = mapped
		}
		entry := models.LogEntry{
			ID:          "e-" + uuid.NewString(),
			Date:        req.Date,
			Meal:        e.Meal,
			FoodID:      foodID,
			PortionID:   e.PortionID,
			Quantity:    e.Quantity,
			CustomGrams: e.CustomGrams,
			CreatedAt:   time.Now().UnixMilli(),
		}
		if err := a.store.InsertLogEntry(userID, entry); err != nil {
			writeError(w, http.StatusInternalServerError, "could not import entries")
			return
		}
		addedEntries++
	}

	if req.WaterMl > 0 {
		if err := a.store.SetWater(userID, req.Date, req.WaterMl); err != nil {
			writeError(w, http.StatusInternalServerError, "could not import water")
			return
		}
	}

	writeJSON(w, http.StatusOK, dayImportResponse{AddedFoods: addedFoods, AddedEntries: addedEntries})
}
