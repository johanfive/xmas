> This file's content is copy-pasted straight from the
> [online doc here](https://help.xmatters.com/xmapi/#services), mistakes, typos and all. This is
> meant to be used as a starting point to build the endpoint, and then as a reference to generate
> validation scenarios in the sandbox. Once the documentation is confirmed accurate or proving to be
> inaccurate, the relevant code implementation is rectified to match the reality of the API, but
> this markdown file here will be left untouched.

# SERVICES

The Service Catalog lets you define the business, technical, and external services performed by,
within, or available to your enterprise – and the teams supporting them. Each service has a group
assigned as its owner — a group can own multiple services, but each service can only have one owner.
You can create, modify, and delete services, as well as retrieve either all services you have
permission to view, or a specific service. For more information see
[Manage Services](https://help.xmatters.com/ondemand/services/services.htm?cshid=Services) section
in the online help.

## Get services

Returns a list of services in your xMatters instance. You can use search for a particular keyword in
the name or description. The services returned in the results are based on your permission level.

```
GET /services
GET /services?search=web service&operand=AND
GET /services?search="web service"&fields=DESCRIPTION
GET /services?serviceTier=GOLD&serviceType=APPLICATION
GET /services?ownedBy=Distribution
```

### QUERY PARAMETERS

- `search` (string)

  A list of search terms separated by the + sign or a space character. The results include services
  with the search term in either the name or description fields. Searches are case-insensitive
  ("alert" finds "alert", "Alert", as well as "alerting") and must contain at least two characters.

  When two or more search terms are present, the result includes services that match either search
  term. Use the operand and fields query parameters to expand or limit search results.

  When your search term contains more than one word, or contains delimiting characters such as
  spaces, enclose the terms in double quotes to preserve the delimiters. Example:
  `/services?search=web service&fields=NAME` returns all services with names that contain either
  "web" or "service". However, searching `/services?search="web service"&fields=NAME` returns all
  services with names that contain "web service".

- `operand` (string)

  The operand to use to limit or expand the search query parameter: AND or OR. AND only returns
  services that have all search terms in the name or description. OR returns services that have any
  of the search terms in the name or description; this is the default if you don’t specify an
  operand. The operand is case-sensitive; for example, lowercase "and" returns an error.

- `fields` (string)

  Defines the field to search when a search term is specified. Valid values include:
  - NAME: The name of the service.
  - DESCRIPTION: The description of the service.

- `ownedBy` (string)

  The targetName or unique id (UUID) of the group that owns the service.

- `serviceTier` (string)

  The tier (or importance level) of a service in your xMatters instance. Valid values include:
  - PLATINUM
  - GOLD
  - SILVER
  - BRONZE
  - NONE

- `serviceType` (string)

  The type of service in your xMatters instance. Valid values include:
  - APPLICATION: An internal or external interface between business services, such as a software
    application
  - TECHNICAL: Any technical service that is not an application service. For example, a resource
    such as a database, component, or microservice.

### Example

Request

```
curl --user username "https://acmeco.xmatters.com/api/xm/1/services"
```

Response

```json
{
  "count": 3,
  "total": 3,
  "data": [
    {
      "id": "b421ba14-57bb-474a-8e0e-614d97f26612",
      "targetName": "API",
      "recipientType": "SERVICE",
      "description": "West Coast API servers",
      "serviceType": "TECHNICAL",
      "serviceTier": "GOLD",
      "ownedBy": {
        "id": "460e6099-bbac-4bf0-a403-e8dbc0f46526",
        "targetName": "API Admins",
        "recipientType": "GROUP",
        "links": {
          "self": "/api/xm/1/groups/460e6099-bbac-4bf0-a403-e8dbc0f46526"
        }
      },
      "links": {
        "self": "/api/xm/1/services/b421ba14-57bb-474a-8e0e-614d97f26612"
      }
    },
    {
      "id": "a421b334-57bb-474a-8e0e-914d97f2aed2",
      "targetName": "Simple Email Service",
      "recipientType": "SERVICE",
      "description": "Service to manage inbound emails",
      "serviceType": "APPLICATION",
      "serviceTier": "SILVER",
      "ownedBy": {
        "id": "332e6099-bbac-4be2-a403-e8dbc0f3e5ca",
        "targetName": "Client Services",
        "recipientType": "GROUP",
        "links": {
          "self": "/api/xm/1/groups/332e6099-bbac-4be2-a403-e8dbc0f3e5ca"
        }
      },
      "links": {
        "self": "/api/xm/1/services/a421b334-57bb-474a-8e0e-914d97f2aed2"
      }
    },
    {
      "id": "c421ba14-bb57-474a-8e03-614d97f2aaed",
      "targetName": "Storage Gateway",
      "recipientType": "SERVICE",
      "description": "Service that controls East Coast storage facilities",
      "serviceType": "APPLICATION",
      "serviceTier": "BRONZE",
      "ownedBy": {
        "id": "8d4b816d-d400-4221-b63d-927dc0934ac5",
        "targetName": "DBA Admins",
        "recipientType": "GROUP",
        "links": {
          "self": "/api/xm/1/groups/8d4b816d-d400-4221-b63d-927dc0934ac5"
        }
      },
      "links": {
        "self": "/api/xm/1/services/c421ba14-bb57-474a-8e03-614d97f2aaed"
      }
    }
  ]
}
```

## Get a service

Returns a specific service in your xMatters instance by its unique identifier (UUID).

```
GET /services/{serviceId}
```

### URL PARAMETERS

- `serviceId` (string)

  The target name or unique identifier (UUID) of a service in xMatters. For example:
  ab1d6091-7d58-41e2-af72-49c69b3d9b65 or Account Database.

### Example

Request

```
curl --user username "https://acmeco.xmatters.com/api/xm/1/services/b421ba14-57bb-474a-8e0e-614d97f26612"
```

Response

```json
{
  "count": 1,
  "total": 1,
  "data": [
    {
      "id": "b421ba14-57bb-474a-8e0e-614d97f26612",
      "targetName": "Simple Email Service",
      "recipientType": "SERVICE",
      "description": "Service to manage inbound emails",
      "serviceType": "APPLICATION",
      "serviceTier": "SILVER",
      "ownedBy": {
        "id": "460e6099-bbac-4bf0-a403-e8dbc0f46526",
        "targetName": "Client Services",
        "recipientType": "GROUP",
        "links": {
          "self": "/api/xm/1/groups/460e6099-bbac-4bf0-a403-e8dbc0f46526"
        }
      },
      "links": {
        "self": "/api/xm/1/services/b421ba14-57bb-474a-8e0e-614d97f26612"
      }
    }
  ]
}
```

## Create a service

Creates a service in xMatters.

```
POST /services
```

### BODY PARAMETERS

- `targetName` (string)

  The name of the service.

- `description` (string)

  The concise description of the service that provides users with additional information.

- `serviceTier` (string)

  The tier (or importance level) of a service in your xMatters instance. Valid values include:
  - PLATINUM
  - GOLD
  - SILVER
  - BRONZE
  - NONE

- `serviceType` (string)

  The type of service in your xMatters instance. Valid values include:
  - APPLICATION: An internal or external interface between business services, such as a software
    application
  - TECHNICAL: Any technical service that is not an application service. For example, a resource
    such as a database, component, or microservice.

### Example

Request

```
curl --user username --header "Content-Type: application/json" --request POST -d ' {
   "targetName": "Simple Email Service",
   "description": "Service to manage inbound emails",
   "serviceType": "APPLICATION",
   "serviceTier": "SILVER",
   "ownedBy": {
     "targetName": "Client Services"
     }
}' "https://acmeco.xmatters.com/api/xm/1/services"
```

Response

```json
{
  "id": "3b636f4f-7403-4b60-ba79-8f49de4509b6",
  "targetName": "Simple Email Service",
  "recipientType": "SERVICE",
  "description": "Service to manage inbound emails",
  "serviceType": "APPLICATION",
  "serviceTier": "SILVER",
  "ownedBy": {
    "id": "75d5e342-3d7f-4de2-8b59-ab9a9b66ade4",
    "targetName": "Client Services",
    "recipientType": "GROUP",
    "links": {
      "self": "/api/xm/1/groups/75d5e342-3d7f-4de2-8b59-ab9a9b66ade4"
    }
  },
  "links": {
    "self": "/api/xm/1/services/3b636f4f-7403-4b60-ba79-8f49de4509b6"
  }
}
```

## Modify a service

Updates a service in xMatters. Identify the service by its unique identifier in the id field, and
then provide the fields you want to modify.

```
POST /services
```

### BODY PARAMETERS

The only required body parameter is the UUID of the service you want to update. See the Create a
service body parameters for details on the other parameters you can change.

- `id` (string)

  The unique identifier (id) or name (targetName) of the service you want to modify.

### Example

Request

```
curl --user username --header "Content-Type: application/json" --request POST -d ' {
   "id": "3b636f4f-7403-4b60-ba79-8f49de4509b6",
   "ownedBy": {
     "targetName": "Customer Support"
     }
}' "https://acmeco.xmatters.com/api/xm/1/services"
```

Response

```json
{
  "id": "3b636f4f-7403-4b60-ba79-8f49de4509b6",
  "targetName": "Simple Email Service",
  "recipientType": "SERVICE",
  "description": "Service to manage inbound emails",
  "ownedBy": {
    "id": "75d5e342-3d7f-4de2-8b59-ab9a9b66ade4",
    "targetName": "Customer Support",
    "recipientType": "GROUP",
    "links": {
      "self": "/api/xm/1/groups/75d5e342-3d7f-4de2-8b59-ab9a9b66ade4"
    }
  },
  "links": {
    "self": "/api/xm/1/services/3b636f4f-7403-4b60-ba79-8f49de4509b6"
  }
}
```

## Delete a service

Deletes a service from your instance using its unique identifier (UUID).

```
DELETE /services/{serviceId}
```

### URL PARAMETERS

- `serviceId` (string)

  The target name or unique identifier (or UUID) of a service in your xMatters system. For example:
  fcf9192d-a647-4e16-b9e2-1768de421e08

### Example

Request

```
curl --user username -X DELETE 
"https://acmeco.xmatters.com/api/xm/1/services/b3d77406-ba58-4ff4-bb5c-4cb0c6787b2d"
```

Response

```json
{
  "id": "b3d77406-ba58-4ff4-bb5c-4cb0c6787b2d",
  "targetName": "Simple Email Service",
  "recipientType": "SERVICE",
  "description": "Service to manage inbound emails",
  "serviceType": "APPLICATION",
  "serviceTier": "SILVER",
  "ownedBy": {
    "id": "75d5e342-3d7f-4de2-8b59-ab9a9b66ade4",
    "targetName": "Client Services",
    "recipientType": "GROUP",
    "links": {
      "self": "/api/xm/1/groups/75d5e342-3d7f-4de2-8b59-ab9a9b66ade4"
    }
  },
  "links": {
    "self": "/api/xm/1/services/b3d77406-ba58-4ff4-bb5c-4cb0c6787b2d"
  }
}
```

## Service object

Describes a service in xMatters.

- `id` (string)

  The unique identifier (id) of the service.
- `targetName` (string)

  The name of the service.
- `recipientType` (string)

  For services, this value is "SERVICE".
- `description` (string)

  The description of the service.
- `serviceTier` (string)

  The tier (or importance level) of a service in your xMatters instance. Valid values include:
  - PLATINUM
  - GOLD
  - SILVER
  - BRONZE
  - NONE
- `serviceType` (string)

  The type of service in your xMatters instance. Valid values include:
  - APPLICATION: An internal or external interface between business services, such as a software
    application
  - TECHNICAL: Any technical service that is not an application service. For example, a resource
    such as a database, component, or microservice.
- `ownedBy` (GroupReference object)

  The targetName or unique id (UUID) of the group that owns the service.

### Example

```json
{
  "id": "b421ba14-57bb-474a-8e0e-614d97f26612",
  "targetName": "Simple Email Service",
  "recipientType": "SERVICE",
  "description": "Service to manage inbound emails",
  "serviceType": "APPLICATION",
  "serviceTier": "SILVER",
  "ownedBy": {
    "id": "460e6099-bbac-4bf0-a403-e8dbc0f46526",
    "targetName": "Customer Support",
    "recipientType": "GROUP",
    "links": {
      "self": "/api/xm/1/groups/460e6099-bbac-4bf0-a403-e8dbc0f46526"
    }
  },
  "links": {
    "self": "/api/xm/1/services/b421ba14-57bb-474a-8e0e-614d97f26612"
  }
}
```
