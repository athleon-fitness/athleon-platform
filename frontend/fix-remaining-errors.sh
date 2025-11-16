#!/bin/bash

# Fix function declaration order issues by moving functions before useEffect calls
echo "Fixing function declaration order..."

# Fix AthleteManagement.jsx
sed -i '/const fetchAthletes = async/,/^  };$/{ 
  /const fetchAthletes = async/i\
  const fetchAthletes = async () => {\
    if (!selectedOrganization) return;\
    try {\
      const response = await client.get("CalisthenicsAPI", `/athletes`);\
      setAthletes(response || []);\
    } catch (error) {\
      console.error("Error fetching athletes:", error);\
    }\
  };\
\
  const fetchCategories = async () => {\
    try {\
      const response = await client.get("CalisthenicsAPI", "/categories");\
      setCategories(response || []);\
    } catch (error) {\
      console.error("Error fetching categories:", error);\
    }\
  };\
\
  const fetchCompetitions = async () => {\
    if (!selectedOrganization) return;\
    try {\
      const response = await client.get("CalisthenicsAPI", `/competitions?organizationId=${selectedOrganization.organizationId}`);\
      setEvents(response || []);\
    } catch (error) {\
      console.error("Error fetching competitions:", error);\
    }\
  };
  d
}' src/components/backoffice/AthleteManagement.jsx

# Fix ScoreEntry.jsx syntax error
sed -i '446s/.*//g' src/components/ScoreEntry.jsx

# Fix CategoryManagement.jsx
sed -i '/useEffect(() => {/i\
  const fetchCategories = async () => {\
    try {\
      const response = await client.get("CalisthenicsAPI", "/categories");\
      setCategories(response || []);\
    } catch (error) {\
      console.error("Error fetching categories:", error);\
    }\
  };\
\
  const applyFilters = () => {\
    let filtered = categories;\
    if (filterGender !== "all") {\
      filtered = filtered.filter(cat => cat.gender === filterGender);\
    }\
    if (filterType !== "all") {\
      filtered = filtered.filter(cat => cat.type === filterType);\
    }\
    setFilteredCategories(filtered);\
  };' src/components/backoffice/CategoryManagement.jsx

echo "Fixed function declaration order issues"
